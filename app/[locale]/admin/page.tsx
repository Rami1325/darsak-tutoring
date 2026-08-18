import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { queueCounts } from "@/lib/admin/queries";

export default async function AdminHome() {
  const t = await getTranslations("admin");
  const counts = await queueCounts();

  const queues = [
    {
      key: "reports" as const,
      total: counts.reports,
      href: "/admin/reports" as const,
      live: true,
    },
    // Both of these have a table, a status column and no producer: nothing
    // uploads a verification and nothing writes a review yet. Listed anyway —
    // a console that shows only the implemented queues is one nobody
    // remembers to extend.
    { key: "verifications" as const, total: counts.verifications, href: null, live: false },
    { key: "reviews" as const, total: counts.reviews, href: null, live: false },
  ];

  return (
    <>
      <p className="mt-6 text-sm text-muted-foreground">{t("subtitle")}</p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {queues.map((queue) => {
          const body = (
            <>
              <span className="text-sm font-medium">
                {t(`queues.${queue.key}`)}
              </span>
              <span className="numeric mt-2 block text-3xl font-semibold tracking-tight">
                {queue.total}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {queue.live ? t("queues.waiting") : t("queues.noProducer")}
              </span>
            </>
          );

          return (
            <li key={queue.key}>
              {queue.href ? (
                <Link
                  href={queue.href}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 opacity-70">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
