import { useLocale, useTranslations } from "next-intl";

import { BrandMark } from "@/components/site/brand";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { featuredExams, featuredSubjects } from "@/lib/taxonomy/subjects";
import { examHref, subjectHref } from "@/lib/routes";

export function SiteFooter() {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border/70 bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark className="size-9" />
            <div>
              <p className="font-semibold">{t("brand.name")}</p>
              <p className="text-sm text-muted-foreground">
                {t("brand.tagline")}
              </p>
            </div>
          </div>
          <LocaleSwitcher className="mt-5" />
        </div>

        <FooterColumn title={t("footer.forStudents")}>
          {featuredSubjects.slice(0, 6).map((subject) => (
            <FooterLink key={subject.slug} href={subjectHref(subject, locale)}>
              {subject[locale]}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t("nav.exams")}>
          {featuredExams.map((exam) => (
            <FooterLink key={exam.slug} href={examHref(exam, locale)}>
              {exam[locale]}
            </FooterLink>
          ))}
          <FooterLink href="/guides">{t("footer.guides")}</FooterLink>
        </FooterColumn>

        <FooterColumn title={t("footer.legal")}>
          <FooterLink href="/about">{t("footer.about")}</FooterLink>
          <FooterLink href="/for-tutors">{t("footer.forTutors")}</FooterLink>
          <FooterLink href="/terms">{t("footer.terms")}</FooterLink>
          <FooterLink href="/privacy">{t("footer.privacy")}</FooterLink>
          <FooterLink href="/accessibility">
            {t("footer.accessibility")}
          </FooterLink>
        </FooterColumn>
      </div>

      <div className="border-t border-border/70">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span className="numeric">{year}</span> · {t("brand.name")} ·{" "}
          {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {children}
      </ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: React.ComponentProps<typeof Link>["href"];
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="transition-colors hover:text-foreground">
        {children}
      </Link>
    </li>
  );
}
