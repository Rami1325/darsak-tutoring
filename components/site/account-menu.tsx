import { LayoutDashboard, LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/actions";

/**
 * Rendered into `SiteHeader`'s `account` slot by the dashboard and onboarding
 * pages, which are dynamic already. Keeping it out of the header itself is what
 * lets the rest of the site stay statically generated.
 */
export async function AccountMenu({ showDashboard = true }: { showDashboard?: boolean }) {
  const t = await getTranslations("nav");
  const auth = await getTranslations("auth");

  return (
    <>
      {showDashboard && (
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
          render={<Link href="/dashboard" />}
        >
          <LayoutDashboard className="size-4" aria-hidden />
          {t("dashboard")}
        </Button>
      )}
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">{auth("signOut")}</span>
        </Button>
      </form>
    </>
  );
}
