import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ScopedMessages } from "@/components/i18n/scoped-messages";
import { BrandMark } from "@/components/site/brand";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ expired?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("forgotTitle"), robots: { index: false, follow: false } };
}

/**
 * Asking for a reset link.
 *
 * Only reachable from the email tab — a phone account has no password to
 * forget, and offering the flow to one would send them looking for a mail that
 * is never coming.
 */
export default async function ForgotPasswordPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const { expired } = await searchParams;

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
            {t("forgotTitle")}
          </h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground">
            {t("forgotSubtitle")}
          </p>
        </div>

        {/* Set by the confirm handler when a link is stale or already spent. */}
        {expired && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
          >
            {t("errors.resetExpired")}
          </p>
        )}

        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-6">
          {isSupabaseConfigured ? (
            <ScopedMessages namespaces={["auth"]}>
              <ForgotPasswordForm />
            </ScopedMessages>
          ) : (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              {t("errors.notConfigured")}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-4 self-center text-muted-foreground"
          render={<Link href="/login" />}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("backToLogin")}
        </Button>
      </main>
      <SiteFooter />
    </>
  );
}
