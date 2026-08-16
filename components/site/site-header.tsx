import { useTranslations } from "next-intl";

import { BrandLogo } from "@/components/site/brand";
import { DemoNotice } from "@/components/site/demo-notice";
import {
  LocaleSwitcher,
  type LocaleSwitcherProps,
} from "@/components/site/locale-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function SiteHeader({
  alternates,
  account,
}: {
  alternates?: LocaleSwitcherProps["alternates"];
  /**
   * Account controls for signed-in users.
   *
   * Deliberately a slot rather than something this component resolves itself:
   * reading the session means reading cookies, and that would opt every page
   * carrying the header out of static generation — all ~1,300 of them. Only the
   * dashboard and onboarding, which are dynamic anyway, pass this.
   */
  account?: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const common = useTranslations("common");

  return (
    <>
      {/* Israeli Standard 5568 requires a skip link; it is also just useful. */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {common("skipToContent")}
      </a>

      <DemoNotice />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6">
          <BrandLogo />

          <nav className="ms-6 hidden items-center gap-1 lg:flex">
            <Button variant="ghost" size="sm" render={<Link href="/tutors" />}>
              {t("findTutor")}
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/guides" />}>
              {t("guides")}
            </Button>
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher alternates={alternates} />

            {account ?? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  render={<Link href="/login" />}
                >
                  {t("login")}
                </Button>
                <Button size="sm" render={<Link href="/for-tutors" />}>
                  {t("becomeTutor")}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
