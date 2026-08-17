"use server";

import { eq } from "drizzle-orm";
import { redirect as redirectToPath } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { redirect } from "@/i18n/navigation";
import { getDb, profiles } from "@/lib/db";
import { normalizeIsraeliPhone } from "@/lib/auth/phone";
import { safeNext } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sign-in is a phone OTP, in three steps: number → code → (first time only)
 * name and role.
 *
 * No password, and email is not asked for at signup. In this market that isn't
 * a simplification for its own sake — mobile-payment-app adoption runs at 16%
 * against 34% nationally and a quarter of users are mobile-only, so every extra
 * field costs real signups.
 */

export type AuthState = {
  step: "phone" | "code" | "profile";
  phone?: string;
  error?: string;
};

/**
 * Where to land once the session exists.
 *
 * `next` is already a resolved, locale-prefixed path — the caller built it from
 * the page they were on — so it goes through `next/navigation`'s redirect
 * rather than next-intl's, which would prefix the locale a second time.
 */
function finish(
  next: string | undefined,
  fallback: "/dashboard" | "/onboarding" | "/",
  locale: string,
) {
  const target = safeNext(next);
  if (target) redirectToPath(target);
  redirect({ href: fallback, locale });
}

const phoneSchema = z.object({
  phone: z.string().min(1),
});

const codeSchema = z.object({
  phone: z.string().min(1),
  code: z.string().regex(/^\d{4,8}$/),
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  fullNameLatin: z.string().trim().max(120).optional(),
  role: z.enum(["student", "tutor"]),
});

export async function requestOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");

  if (!isSupabaseConfigured) {
    return { step: "phone", error: t("errors.notConfigured") };
  }

  const parsed = phoneSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { step: "phone", error: t("errors.invalidPhone") };
  }

  const phone = normalizeIsraeliPhone(parsed.data.phone);
  if (!phone) {
    return { step: "phone", error: t("errors.invalidPhone") };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    return { step: "phone", phone, error: t("errors.sendFailed") };
  }

  return { step: "code", phone };
}

export async function verifyOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");

  const parsed = codeSchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return {
      step: "code",
      phone: String(formData.get("phone") ?? ""),
      error: t("errors.invalidCode"),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.code,
    type: "sms",
  });

  if (error || !data.user) {
    return { step: "code", phone: parsed.data.phone, error: t("errors.wrongCode") };
  }

  // A verified session can exist before a profile does — that gap is exactly
  // what the third step fills.
  const [existing] = await getDb()
    .select({ id: profiles.id, roles: profiles.roles })
    .from(profiles)
    .where(eq(profiles.id, data.user.id))
    .limit(1);

  if (!existing) {
    return { step: "profile", phone: parsed.data.phone };
  }

  const locale = await getLocale();
  finish(
    String(formData.get("next") ?? ""),
    existing.roles.includes("tutor") ? "/dashboard" : "/",
    locale,
  );

  return { step: "profile" };
}

export async function completeProfile(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");
  const locale = await getLocale();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { step: "phone", error: t("errors.sessionExpired") };
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    fullNameLatin: formData.get("fullNameLatin") || undefined,
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { step: "profile", error: t("errors.invalidName") };
  }

  await getDb()
    .insert(profiles)
    .values({
      id: user.id,
      roles: [parsed.data.role],
      phone: user.phone ? `+${user.phone.replace(/^\+/, "")}` : "",
      phoneVerified: true,
      fullName: parsed.data.fullName,
      fullNameLatin: parsed.data.fullNameLatin ?? null,
      locale,
    })
    .onConflictDoNothing();

  /*
   * A brand-new tutor goes to the wizard regardless of where they came from —
   * they have no profile to contact anyone with yet. A student resumes whatever
   * they were doing, which is usually the inquiry they had already filled in.
   */
  finish(
    parsed.data.role === "tutor" ? undefined : String(formData.get("next") ?? ""),
    parsed.data.role === "tutor" ? "/onboarding" : "/",
    locale,
  );

  return { step: "profile" };
}

/**
 * Single entry point for the form.
 *
 * `useActionState` binds one action, and the flow has three steps — so the step
 * travels in the form itself and is dispatched here. That also means the form
 * degrades to a plain multi-page POST without JavaScript.
 */
export async function authenticate(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  switch (String(formData.get("step") ?? "phone")) {
    case "code":
      return verifyOtp(prev, formData);
    case "profile":
      return completeProfile(prev, formData);
    default:
      return requestOtp(prev, formData);
  }
}

export async function signOut() {
  const locale = await getLocale();

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect({ href: "/", locale });
}
