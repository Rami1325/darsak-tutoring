import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AccountMenu } from "@/components/site/account-menu";
import { SiteHeader } from "@/components/site/site-header";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/session";

/**
 * Never indexed, whatever robots.txt happens to say today.
 *
 * The site-wide `Disallow: /` lifts the moment a custom domain is attached, and
 * "the console was fine because nothing was indexable yet" is not a property
 * worth depending on.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The moderation console.
 *
 * `requireRole("admin")` here is the entire protection for every page beneath
 * it. Drizzle connects as the database owner and bypasses RLS, so the policies
 * in `002_rls.sql` and `006_admin.sql` are not a second line for this path —
 * they guard direct client access, which the console does not use. A route
 * added under here without this layout is a full data leak with nothing
 * underneath to catch it.
 *
 * Server actions do not inherit it. A layout never runs for an action, so each
 * one in `lib/admin/actions.ts` re-checks the role itself.
 *
 * **Nothing in the product grants the admin role.** Signup accepts only
 * `student` and `tutor`, and onboarding only ever appends `tutor` — so the
 * first admin is made by hand:
 *
 *     update profiles set roles = array_append(roles, 'admin')
 *      where id = '<uuid>';
 *
 * That is deliberate. A UI that can grant admin is a UI that can be tricked
 * into granting admin, and this product has one operator.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin");

  return (
    <>
      <SiteHeader account={<AccountMenu />} />

      <main id="content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("signedInAs", { name: admin.displayName ?? admin.fullName })}
          </p>
        </div>

        <nav className="mt-4 flex flex-wrap gap-2 border-b border-border pb-4">
          <Link
            href="/admin"
            className="rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            {t("title")}
          </Link>
          <Link
            href="/admin/reports"
            className="rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            {t("queues.reports")}
          </Link>
        </nav>

        {children}
      </main>
    </>
  );
}
