import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { ScopedMessages } from "@/components/i18n/scoped-messages";
import { BrandMark } from "@/components/site/brand";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getProfile } from "@/lib/auth/session";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Props = { params: Promise<{ locale: string }> };

const href = () => "/login" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return {
    title: t("title"),
    // A sign-in form has nothing to rank for.
    robots: { index: false, follow: true },
    alternates: alternatesMetadata(alternatePaths(href), locale as Locale),
  };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");

  // Already signed in — nothing to do here.
  const profile = await getProfile();
  if (profile) {
    redirect({
      href: profile.roles.includes("tutor") ? "/dashboard" : "/",
      locale,
    });
  }

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
            {t("title")}
          </h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-6">
          {isSupabaseConfigured ? (
            <ScopedMessages namespaces={["auth"]}>
              <LoginForm />
            </ScopedMessages>
          ) : (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              {t("errors.notConfigured")}
            </p>
          )}
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {t.rich("legal", {
              terms: (chunks) => (
                <Link
                  href="/terms"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
