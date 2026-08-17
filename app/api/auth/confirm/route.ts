import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale } from "@/i18n/routing";
import { PASSWORD_RESET_COOKIE } from "@/lib/auth/password-reset";
import { safeNext } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where every emailed auth link lands: password reset today, address
 * confirmation and Google's callback on the same handler later.
 *
 * Under `/api` deliberately. The proxy's matcher excludes that prefix, so
 * next-intl does not try to resolve a locale for a URL that Supabase built and
 * redirect `/auth/confirm` to `/ar/auth/confirm` before this code ever runs.
 * The locale to return to travels in `next` instead.
 *
 * Both link shapes are handled, because which one arrives depends on the email
 * template rather than on anything in this repository. Supabase's stock
 * template sends the reader through its own `/auth/v1/verify`, which lands here
 * with a `code`; a template switched to `{{ .TokenHash }}` links here directly
 * with `token_hash` and `type`. Supporting one and not the other is a flow that
 * breaks the day somebody edits the email copy.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const next =
    safeNext(searchParams.get("next")) ?? `/${defaultLocale}/reset-password`;

  // Send a failed link back to the form in the locale it was requested from,
  // which is the one already sitting at the front of `next`.
  const segment = next.split("/")[1] ?? "";
  const locale = isLocale(segment) ? segment : defaultLocale;
  const failure = new URL(`/${locale}/forgot-password?expired=1`, request.url);

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(failure);
  }

  const supabase = await createSupabaseServerClient();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Only the recovery journey earns the password-change marker. A signup
  // confirmation proves the same address, but it is not a request to replace a
  // credential and should not silently become one.
  const recovery =
    searchParams.get("intent") === "recovery" || type === "recovery";

  /*
   * The session cookies the exchange writes ride out on this response.
   *
   * A Route Handler is one of the two places `cookies()` is writable — the
   * reason `createSupabaseServerClient` swallows the failure elsewhere — and
   * Next merges those writes into whatever response the handler returns,
   * redirects included. Which is the whole reason this is a handler and not a
   * page: a Server Component could verify the link and then lose the session
   * it just created.
   */
  const response = NextResponse.redirect(new URL(next, request.url));

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return NextResponse.redirect(failure);
    return recovery ? grantPasswordChange(response) : response;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(failure);
    return recovery ? grantPasswordChange(response) : response;
  }

  return NextResponse.redirect(failure);
}

/**
 * A short-lived marker saying "this session was just proved by email".
 *
 * Without it, `/reset-password` would accept any signed-in visitor, and
 * changing a password with no knowledge of the old one is precisely how a
 * stolen session gets turned into a permanent one — the owner is locked out of
 * their own account. There is no current-password field to ask for here, by
 * definition, so what stands in its place is having opened the mail in the last
 * few minutes.
 *
 * `httpOnly`, so page scripts cannot mint it, and deliberately short: the gap
 * between clicking a link and typing a password is a minute, not a session.
 */
function grantPasswordChange(response: NextResponse) {
  response.cookies.set(PASSWORD_RESET_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
  return response;
}
