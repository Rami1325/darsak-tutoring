import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { reopenReport, resolveReport } from "@/lib/admin/actions";
import { listReports, type ReportStatus } from "@/lib/admin/queries";
import { formatTimestamp } from "@/lib/format";
import { tutorHref } from "@/lib/routes";

const TABS: ReportStatus[] = ["open", "actioned", "dismissed"];

function isStatus(value: string): value is ReportStatus {
  return (TABS as string[]).includes(value);
}

/**
 * The one queue with rows in it.
 *
 * The report dialog has shipped on every tutor profile and every thread since
 * Phase 3, and until now the only `select` on the table anywhere was the
 * duplicate check inside `reportTarget` itself — people were being told their
 * complaint would be looked at while no human could see it.
 */
export default async function ReportsQueue({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: requested } = await searchParams;

  const status: ReportStatus =
    requested && isStatus(requested) ? requested : "open";

  const t = await getTranslations("admin.reports");
  const rows = await listReports(status);
  const typedLocale = locale as Locale;

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={{ pathname: "/admin/reports", query: { status: tab } }}
            className={
              tab === status
                ? "rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-full border border-border px-3.5 py-1.5 text-sm transition-colors hover:bg-muted"
            }
          >
            {t(tab)}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {t("privacyNote")}
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {row.targetType === "tutor"
                    ? t("typeTutor")
                    : t("typeConversation")}
                </span>
                <span className="font-medium">{row.targetLabel}</span>
                {row.targetSlug && (
                  <Link
                    href={tutorHref(row.targetSlug)}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {t("viewProfile")}
                  </Link>
                )}
                <span className="numeric ms-auto text-xs text-muted-foreground">
                  {formatTimestamp(row.createdAt, typedLocale)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">
                {row.reason}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                {t("reporter")}: {row.reporterName ?? t("unknown")}
                {row.resolvedByName && (
                  <>
                    {" · "}
                    {t("closedBy")}: {row.resolvedByName}
                  </>
                )}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {status === "open" ? (
                  <>
                    <form action={resolveReport}>
                      <input type="hidden" name="reportId" value={row.id} />
                      <input type="hidden" name="outcome" value="actioned" />
                      <Button type="submit" size="sm">
                        {t("actionIt")}
                      </Button>
                    </form>
                    <form action={resolveReport}>
                      <input type="hidden" name="reportId" value={row.id} />
                      <input type="hidden" name="outcome" value="dismissed" />
                      <Button type="submit" size="sm" variant="outline">
                        {t("dismissIt")}
                      </Button>
                    </form>
                  </>
                ) : (
                  /* Nothing is terminal, the same rule the lesson lifecycle
                     follows: a mis-tap must not be a decision nobody can
                     revisit. The reopening is audited too. */
                  <form action={reopenReport}>
                    <input type="hidden" name="reportId" value={row.id} />
                    <Button type="submit" size="sm" variant="outline">
                      {t("reopen")}
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
