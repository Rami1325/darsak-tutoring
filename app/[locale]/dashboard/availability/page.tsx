import { CalendarClock, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedMessages } from "@/components/i18n/scoped-messages";
import { AvailabilityEditor } from "@/components/scheduling/availability-editor";
import { AccountMenu } from "@/components/site/account-menu";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getOwnTutor, requireProfile } from "@/lib/auth/session";
import { getSelectedHours } from "@/lib/scheduling/availability";
import { weekdayLabels } from "@/lib/scheduling/labels";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "availability" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * When the tutor is open for lessons.
 *
 * A weekly pattern rather than a per-date calendar: a tutor sets "Tuesdays and
 * Thursdays after four" once and it keeps being true, where a two-week grid
 * would need re-filling every fortnight and would be stale the moment it wasn't.
 * One-off changes belong in `availability_exceptions`, which the schema carries
 * and this page does not edit yet.
 */
export default async function AvailabilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await requireProfile();
  const tutor = await getOwnTutor();

  // Availability without a profile to attach it to is meaningless — send them
  // to build the profile first rather than showing an orphan calendar.
  if (!tutor) redirect({ href: "/onboarding", locale });

  const t = await getTranslations("availability");
  const selected = await getSelectedHours(profile.id);

  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main id="content" className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 mb-3 text-muted-foreground"
          render={<Link href="/dashboard" />}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("backToDashboard")}
        </Button>

        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CalendarClock className="size-6 text-primary" aria-hidden />
          {t("title")}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          {t("description")}
        </p>

        <div className="mt-6">
          <ScopedMessages namespaces={["availability"]}>
            <AvailabilityEditor
              selected={[...selected]}
              weekdayLabels={weekdayLabels(locale as Locale)}
            />
          </ScopedMessages>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
