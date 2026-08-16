/**
 * Supabase configuration.
 *
 * The public directory — every landing page, tutor profile and guide — works
 * with no Supabase at all, on fixture data. Only the account surfaces need it.
 * So configuration is treated as optional and checked, rather than asserted at
 * module load, which would break `next build` on a machine with no project.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or run " +
        "`npx supabase start` for a local stack.",
    );
  }
}
