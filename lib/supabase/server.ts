import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Server-side Supabase client, bound to the request's cookies.
 *
 * `setAll` is wrapped because Server Components cannot mutate cookies — the
 * write throws there and is safe to swallow, since the proxy refreshes the
 * session on every request anyway. Server Actions and Route Handlers can write,
 * and that's where sign-in and sign-out live.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — the proxy handles the refresh.
        }
      },
    },
  });
}
