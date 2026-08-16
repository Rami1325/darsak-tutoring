import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "./config";

/**
 * Service-role client. Bypasses RLS entirely — never import this into anything
 * that reaches the browser, and never use it to serve a request on behalf of a
 * user. It exists for admin-side work: reviewing verification documents and
 * reading signed URLs for private storage objects.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
