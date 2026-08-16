import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Refresh the auth session on every request and copy the rotated cookies onto
 * the response next-intl already produced.
 *
 * `getUser()` is the call that matters: it revalidates the token against the
 * auth server rather than trusting whatever the cookie claims, and it triggers
 * the refresh. Without it, sessions expire mid-visit and Server Components —
 * which cannot write cookies — have no way to renew them.
 *
 * Route protection is deliberately NOT done here. With localised pathnames the
 * proxy would have to pattern-match `/لوحة-المعلم`, `/לוח-בקרה` and
 * `/dashboard` separately; guarding inside the page with `requireUser()` is
 * both simpler and harder to get wrong.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
) {
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
