"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect as redirectToPath } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { getPathname, redirect } from "@/i18n/navigation";
import { getDb, profiles } from "@/lib/db";
import { normalizeIsraeliPhone } from "@/lib/auth/phone";
import { PASSWORD_RESET_COOKIE } from "@/lib/auth/password-reset";
import { safeNext } from "@/lib/auth/redirect";
import { siteConfig } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Two doors, one desk.
 *
 * **Phone OTP** is the default and stays first: number → code → (first time
 * only) name and role. In this market that ordering is not a preference —
 * mobile-payment-app adoption runs at 16% against 34% nationally, a quarter of
 * users are mobile-only, and a password is one more thing to lose on a phone.
 *
 * **Email and password** is the second door. It costs a field but it buys two
 * things the OTP cannot: it works where SMS delivery does not, and it needs no
 * gateway — which is the difference between a deployment where nobody can
 * create an account and one where they can. Google will slot in beside it as a
 * third `method` without touching the steps.
 *
 * Both doors converge on the same third step, and the profile row is written
 * from Supabase's user object rather than from the form's `method`: what the
 * database records about how someone verified themselves must come from the
 * session, not from a field the browser sent.
 */

export type AuthMethod = "phone" | "email";

export type AuthState = {
  step: "phone" | "code" | "email" | "profile" | "confirm";
  /** Which door is on screen. Presentation only — never trusted for a write. */
  method?: AuthMethod;
  phone?: string;
  email?: string;
  /** Email door only. */
  intent?: "signin" | "signup";
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

/**
 * 72 bytes is bcrypt's ceiling — anything past it is silently ignored, so a
 * longer password would be accepted at signup and then partly disregarded at
 * sign-in. Eight is the floor rather than Supabase's default six.
 */
const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
  intent: z.enum(["signin", "signup"]),
});

export async function requestOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");

  if (!isSupabaseConfigured) {
    return { step: "phone", method: "phone", error: t("errors.notConfigured") };
  }

  const parsed = phoneSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { step: "phone", method: "phone", error: t("errors.invalidPhone") };
  }

  const phone = normalizeIsraeliPhone(parsed.data.phone);
  if (!phone) {
    return { step: "phone", method: "phone", error: t("errors.invalidPhone") };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    return { step: "phone", method: "phone", phone, error: t("errors.sendFailed") };
  }

  return { step: "code", method: "phone", phone };
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
      method: "phone",
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
    return {
      step: "code",
      method: "phone",
      phone: parsed.data.phone,
      error: t("errors.wrongCode"),
    };
  }

  return afterSignIn(data.user.id, formData, {
    step: "profile",
    method: "phone",
    phone: parsed.data.phone,
  });
}

/**
 * The email door, both directions.
 *
 * Sign-in failures are answered with one message whatever went wrong. "No such
 * account" and "wrong password" told apart is an account-enumeration oracle,
 * and in a community this tightly networked, confirming that a particular
 * person has a tutor account here is itself the leak.
 */
export async function emailAuth(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");
  const base: AuthState = {
    step: "email",
    method: "email",
    email: String(formData.get("email") ?? ""),
    intent: formData.get("intent") === "signup" ? "signup" : "signin",
  };

  if (!isSupabaseConfigured) {
    return { ...base, error: t("errors.notConfigured") };
  }

  const parsed = emailSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    const badPassword = parsed.error.issues.some((i) => i.path[0] === "password");
    return {
      ...base,
      error: badPassword ? t("errors.weakPassword") : t("errors.invalidEmail"),
    };
  }

  const { email, password, intent } = parsed.data;
  const supabase = await createSupabaseServerClient();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      /*
       * Where the confirmation link comes back to, when the project requires
       * one. Without this it goes to `site_url`, and the reader lands on the
       * home page holding a session but no profile row — signed in, invisible
       * to the marketplace, and never asked for the name and role that would
       * fix it. `/login` picks that state up and resumes at the third step.
       */
      options: { emailRedirectTo: await confirmUrl("/login") },
    });

    if (error) {
      return { ...base, email, error: t("errors.signUpFailed") };
    }

    /*
     * Supabase does not error when the address is already registered — it
     * returns a user with an empty `identities` array, deliberately, so signup
     * cannot be used to enumerate accounts either. Treated as "go and sign in",
     * which is true whether or not the account is theirs.
     */
    if (data.user && data.user.identities?.length === 0) {
      return { ...base, email, intent: "signin", error: t("errors.emailTaken") };
    }

    // No session means the project requires a confirmation click first.
    if (!data.session) {
      return { step: "confirm", method: "email", email };
    }

    return afterSignIn(data.user?.id, formData, { ...base, email });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const unconfirmed = error.code === "email_not_confirmed";
    return {
      ...base,
      email,
      error: unconfirmed ? t("errors.emailUnconfirmed") : t("errors.badCredentials"),
    };
  }

  return afterSignIn(data.user?.id, formData, { ...base, email });
}

/* ── Password reset ──────────────────────────────────────────────────────── */

export type ResetState = { sent?: boolean; error?: string; email?: string };
export type NewPasswordState = { error?: string };

/**
 * Absolute URL of the callback, carrying where to go afterwards.
 *
 * Absolute because Supabase puts it in an email, and `intent` because the
 * handler mints a password-change marker only for the recovery journey — a
 * signup confirmation should not also hand out the right to change a password.
 */
async function confirmUrl(
  destination: "/login" | "/reset-password",
): Promise<string> {
  const locale = await getLocale();
  const params = new URLSearchParams({
    next: getPathname({ href: destination, locale }),
  });
  if (destination === "/reset-password") params.set("intent", "recovery");

  return new URL(`/api/auth/confirm?${params}`, siteConfig.url).toString();
}

/**
 * Send the reset link.
 *
 * Answers "we sent it, if that address has an account" whatever happened —
 * including when the address is unknown, and including when Supabase itself
 * errors. A form that says "no such account" is an enumeration oracle, and it
 * is the same oracle the sign-in path already refuses to be.
 *
 * The link lands on `/api/auth/confirm`, which is outside `[locale]`, so the
 * locale to come back to travels in `next` and is validated by `safeNext()` on
 * the way out. Delivery is Supabase's to do: with no SMTP configured the mail
 * goes to the local Inbucket in development and to Supabase's rate-limited
 * default sender in the cloud, which is fine for a handful of resets and is the
 * reason this flow does not wait on choosing a provider.
 */
export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const t = await getTranslations("auth");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!isSupabaseConfigured) {
    return { error: t("errors.notConfigured"), email };
  }

  const parsed = z.string().email().max(255).safeParse(email);
  if (!parsed.success) {
    return { error: t("errors.invalidEmail"), email };
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = await confirmUrl("/reset-password");

  // Result deliberately ignored — see above.
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo });

  return { sent: true, email: parsed.data };
}

/**
 * Set the new password, using the session the reset link established.
 *
 * There is no "old password" field and there cannot be one: the entire point
 * of this path is that the person does not know it. What stands in for it is
 * the recovery session, which only someone holding the mail could have.
 */
export async function updatePassword(
  _prev: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const t = await getTranslations("auth");
  const locale = await getLocale();

  const parsed = z
    .string()
    .min(8)
    .max(72)
    .safeParse(formData.get("password"));

  if (!parsed.success) {
    return { error: t("errors.weakPassword") };
  }

  if (parsed.data !== String(formData.get("passwordConfirm") ?? "")) {
    return { error: t("errors.passwordMismatch") };
  }

  // Re-checked here and not only on the page: a Server Action is its own
  // entry point, reachable without ever rendering the form that fronts it.
  const cookieStore = await cookies();
  if (!cookieStore.has(PASSWORD_RESET_COOKIE)) {
    return { error: t("errors.resetExpired") };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.resetExpired") };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return { error: t("errors.resetFailed") };
  }

  // One link, one password change.
  cookieStore.delete(PASSWORD_RESET_COOKIE);

  const [existing] = await getDb()
    .select({ roles: profiles.roles })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  // Already signed in by the recovery link, so there is nowhere to send them
  // but on with their day.
  finish(undefined, existing?.roles.includes("tutor") ? "/dashboard" : "/", locale);

  return {};
}

/**
 * Shared tail of every successful authentication.
 *
 * A verified session can exist before a profile does — that gap is what the
 * third step fills, and it is the same gap whichever door produced the session.
 */
async function afterSignIn(
  userId: string | undefined,
  formData: FormData,
  fallbackState: AuthState,
): Promise<AuthState> {
  if (!userId) return fallbackState;

  const [existing] = await getDb()
    .select({ id: profiles.id, roles: profiles.roles })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!existing) {
    return { ...fallbackState, step: "profile", error: undefined };
  }

  const locale = await getLocale();
  finish(
    String(formData.get("next") ?? ""),
    existing.roles.includes("tutor") ? "/dashboard" : "/",
    locale,
  );

  return { ...fallbackState, step: "profile", error: undefined };
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
    return { step: "phone", method: "phone", error: t("errors.sessionExpired") };
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    fullNameLatin: formData.get("fullNameLatin") || undefined,
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      step: "profile",
      method: user.phone ? "phone" : "email",
      error: t("errors.invalidName"),
    };
  }

  /*
   * Read off the session, never off the form.
   *
   * Which of the two doors someone came through is visible here as a property
   * of the verified user — a phone-OTP session carries `phone`, an email
   * session carries `email` — and taking it from there means a forged `method`
   * field cannot mark an unverified address as verified. `phone` is null rather
   * than `''` for an email account, because the column's unique index would
   * otherwise let exactly one of them exist.
   */
  await getDb()
    .insert(profiles)
    .values({
      id: user.id,
      roles: [parsed.data.role],
      phone: user.phone ? `+${user.phone.replace(/^\+/, "")}` : null,
      phoneVerified: Boolean(user.phone),
      email: user.email ?? null,
      emailVerified: Boolean(user.email_confirmed_at),
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
 * `useActionState` binds one action and the flow has several steps, so the step
 * travels in the form itself and is dispatched here. That is also what lets the
 * whole thing degrade to a plain multi-page POST with no JavaScript — including
 * switching between the two doors, which is a submit button rather than client
 * state for exactly that reason.
 */
export async function authenticate(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  /*
   * Navigation buttons carry `switch`, not `step`.
   *
   * A submit button named `step` would put a *second* `step` entry in the
   * FormData, and the spec builds that list in tree order — so `get()` would
   * return the hidden field at the top of the form and the button would do
   * nothing but resubmit the current step. That is the same shape as the
   * duplicate-`phone` bug from Phase 2, and a separate name is the fix that
   * cannot come back.
   */
  const nav = formData.get("switch");
  const typedEmail = String(formData.get("email") ?? "");
  const intent = formData.get("intent") === "signup" ? "signup" : "signin";

  if (nav === "phone") {
    return { step: "phone", method: "phone" };
  }
  // Choosing the email door is not the same as toggling what it does there:
  // arriving from the phone tab must land on sign-in, not on sign-up.
  if (nav === "email") {
    return { step: "email", method: "email", email: typedEmail, intent };
  }
  if (nav === "intent") {
    return {
      step: "email",
      method: "email",
      email: typedEmail,
      intent: intent === "signup" ? "signin" : "signup",
    };
  }

  switch (String(formData.get("step") ?? "phone")) {
    case "code":
      return verifyOtp(prev, formData);
    case "email":
      return emailAuth(prev, formData);
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
