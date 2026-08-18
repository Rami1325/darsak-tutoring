import { defineRouting, type Pathnames } from "next-intl/routing";

export const locales = ["ar", "he", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

/**
 * Native-script URL segments.
 *
 * The incumbent runs its entire directory on Hebrew-script slugs
 * (`/מורה-פרטי/מתמטיקה`) and ranks on them: Google indexes percent-encoded
 * URLs without trouble and renders them as native script in results, which
 * lifts click-through. We do the same in Arabic and Hebrew, and keep Latin for
 * `en`.
 *
 * Keys are the internal (canonical) paths that the `app/` directory mirrors;
 * values are what the user and the crawler see. Dynamic segment *values* are
 * localised separately via `localizedSlug()` — next-intl only translates the
 * static parts.
 */
export const pathnames = {
  "/": "/",

  "/tutors": {
    ar: "/معلم-خصوصي",
    he: "/מורה-פרטי",
    en: "/tutors",
  },
  "/tutors/[subject]": {
    ar: "/معلم-خصوصي/[subject]",
    he: "/מורה-פרטי/[subject]",
    en: "/tutors/[subject]",
  },
  "/tutors/[subject]/[locality]": {
    ar: "/معلم-خصوصي/[subject]/[locality]",
    he: "/מורה-פרטי/[subject]/[locality]",
    en: "/tutors/[subject]/[locality]",
  },

  "/online/[subject]": {
    ar: "/دروس-اونلاين/[subject]",
    he: "/שיעורים-אונליין/[subject]",
    en: "/online-lessons/[subject]",
  },

  "/exams/[exam]": {
    ar: "/امتحانات/[exam]",
    he: "/בחינות/[exam]",
    en: "/exams/[exam]",
  },

  "/cities/[locality]": {
    ar: "/مدن/[locality]",
    he: "/ערים/[locality]",
    en: "/cities/[locality]",
  },

  "/tutor/[slug]": {
    ar: "/معلم/[slug]",
    he: "/מורה/[slug]",
    en: "/tutor/[slug]",
  },

  /**
   * The inquiry form. Its own route rather than a section of the profile page,
   * because it has to read the session and the profile page has to stay static.
   */
  "/inquiry/[slug]": {
    ar: "/طلب-درس/[slug]",
    he: "/בקשת-שיעור/[slug]",
    en: "/request/[slug]",
  },

  "/guides": { ar: "/أدلة", he: "/מדריכים", en: "/guides" },
  "/guides/[slug]": {
    ar: "/أدلة/[slug]",
    he: "/מדריכים/[slug]",
    en: "/guides/[slug]",
  },

  /** Supply-side landing page — carries the "no commission" pitch. */
  "/for-tutors": { ar: "/للمعلمين", he: "/למורים", en: "/for-tutors" },

  // ── Account surfaces ──────────────────────────────────────────────────────
  "/login": { ar: "/دخول", he: "/כניסה", en: "/login" },
  /**
   * Password reset, for the email door only. The emailed link itself lands on
   * `/api/auth/confirm`, which is outside this map on purpose — the proxy skips
   * `/api`, so next-intl never tries to give a Supabase-built URL a locale.
   */
  "/forgot-password": {
    ar: "/نسيت-كلمة-السر",
    he: "/שכחתי-סיסמה",
    en: "/forgot-password",
  },
  "/reset-password": {
    ar: "/كلمة-سر-جديدة",
    he: "/סיסמה-חדשה",
    en: "/reset-password",
  },
  "/onboarding": {
    ar: "/تسجيل-معلم",
    he: "/הרשמת-מורה",
    en: "/become-a-tutor",
  },
  "/dashboard": { ar: "/لوحتي", he: "/הלוח-שלי", en: "/dashboard" },
  /**
   * One inbox for both sides. A tutor's "leads" and a student's "messages" are
   * the same rows read from opposite ends, and splitting them into two surfaces
   * would double the code to show one conversation.
   */
  "/messages": { ar: "/رسائلي", he: "/הודעות", en: "/messages" },
  "/messages/[id]": {
    ar: "/رسائلي/[id]",
    he: "/הודעות/[id]",
    en: "/messages/[id]",
  },
  /**
   * The week calendar. One surface for both sides, for the same reason the
   * inbox is: a tutor's booked hours and a student's booked hours are the same
   * rows read from opposite ends.
   */
  "/schedule": { ar: "/جدولي", he: "/היומן-שלי", en: "/schedule" },
  "/dashboard/profile": {
    ar: "/لوحتي/صفحتي",
    he: "/הלוח-שלי/הפרופיל",
    en: "/dashboard/profile",
  },
  "/dashboard/verification": {
    ar: "/لوحتي/التوثيق",
    he: "/הלוח-שלי/אימות",
    en: "/dashboard/verification",
  },
  "/dashboard/availability": {
    ar: "/لوحتي/أوقاتي",
    he: "/הלוח-שלי/הזמינות",
    en: "/dashboard/availability",
  },
  /** Internal — stays Latin in every locale on purpose. */
  "/admin": "/admin",
  "/admin/reports": "/admin/reports",
  "/admin/verifications": "/admin/verifications",

  "/about": { ar: "/من-نحن", he: "/אודות", en: "/about" },
  "/terms": { ar: "/شروط-الاستخدام", he: "/תנאי-שימוש", en: "/terms" },
  "/privacy": {
    ar: "/سياسة-الخصوصية",
    he: "/מדיניות-פרטיות",
    en: "/privacy",
  },
  "/accessibility": {
    ar: "/بيان-إمكانية-الوصول",
    he: "/הצהרת-נגישות",
    en: "/accessibility",
  },
} satisfies Pathnames<typeof locales>;

/**
 * `localePrefix: "always"` keeps every URL explicitly namespaced (`/ar/...`,
 * `/he/...`, `/en/...`). Organic search is this product's growth engine, so we
 * trade the prettier unprefixed default-locale URL for zero canonical
 * ambiguity across the three hreflang variants.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  pathnames,
});

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  he: "rtl",
  en: "ltr",
};

/** Endonyms — each language named in itself. */
export const localeNames: Record<Locale, string> = {
  ar: "العربية",
  he: "עברית",
  en: "English",
};

export const localeHtmlLang: Record<Locale, string> = {
  ar: "ar-IL",
  he: "he-IL",
  en: "en-IL",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
