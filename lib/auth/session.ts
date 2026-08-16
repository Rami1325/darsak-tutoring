import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { getDb, profiles, type profiles as ProfilesTable } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = typeof ProfilesTable.$inferSelect;
export type Role = Profile["roles"][number];

/**
 * Auth lives in Supabase; data lives in Postgres via Drizzle.
 *
 * Every server-side query is scoped explicitly by the authenticated user id
 * taken from `getAuthUser()`. Drizzle connects as the database owner and so
 * bypasses RLS — the policies in `supabase/sql/002_rls.sql` are defence in
 * depth for direct client access, never the only thing standing between one
 * user's data and another's.
 *
 * `cache()` dedupes within a single render pass, so a layout and three nested
 * components asking "who is this?" cost one round trip.
 */
export const getAuthUser = cache(async () => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createSupabaseServerClient();
  // getUser() revalidates against the auth server; getSession() would trust
  // whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const [row] = await getDb()
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return row ?? null;
});

/** Redirects to the locale-appropriate login page when signed out. */
export async function requireUser() {
  const user = await getAuthUser();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }
  return user!;
}

/**
 * A signed-in user who has completed profile bootstrap. Someone can hold a
 * valid session with no profile row for the moment between verifying an OTP
 * and choosing a role.
 */
export async function requireProfile(): Promise<Profile> {
  await requireUser();
  const profile = await getProfile();

  if (!profile) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  return profile!;
}

export async function requireRole(role: Role): Promise<Profile> {
  const profile = await requireProfile();

  if (!profile.roles.includes(role)) {
    const locale = await getLocale();
    redirect({ href: "/", locale });
  }

  return profile;
}

export function hasRole(profile: Profile | null, role: Role) {
  return profile?.roles.includes(role) ?? false;
}
