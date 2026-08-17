import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ScopedMessages } from "@/components/i18n/scoped-messages";
import { BrandMark } from "@/components/site/brand";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PASSWORD_RESET_COOKIE } from "@/lib/auth/password-reset";
import { getAuthUser } from "@/lib/auth/session";
import { cookies } from "next/headers";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("resetTitle"), robots: { index: false, follow: false } };
}

/**
 * Choosing the new password.
 *
 * Reached only through the emailed link, which `/api/auth/confirm` turns into a
 * session before redirecting here.
 *
 * Two things are required, not one. A session, obviously — but also the marker
 * the handler sets, because a session on its own is what an attacker who stole
 * a cookie already has, and letting them set a new password without knowing the
 * old one is how they keep the account. There is no current-password field to
 * ask for on this particular page, so the marker is what stands in for it.
 *
 * `getAuthUser()` revalidates against the auth server rather than trusting the
 * cookie, which matters more here than anywhere else in the product: this page
 * hands out the right to change a credential.
 */
export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const [authUser, cookieStore] = await Promise.all([getAuthUser(), cookies()]);
  const user = cookieStore.has(PASSWORD_RESET_COOKIE) ? authUser : null;

  return (
    <>
      <SiteHeader />
      <main
        id="content"
        className="mx-auto flex max-w-md flex-col px-4 py-10 sm:px-6"
      >
        <div className="text-center">
          <BrandMark className="mx-auto size-12" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {t("resetTitle")}
          </h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground">
            {user ? t("resetSubtitle") : t("errors.resetExpired")}
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-6">
          {user ? (
            <ScopedMessages namespaces={["auth"]}>
              <ResetPasswordForm />
            </ScopedMessages>
          ) : (
            <Button
              size="2xl"
              className="w-full"
              render={<Link href="/forgot-password" />}
            >
              {t("requestNewLink")}
            </Button>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
