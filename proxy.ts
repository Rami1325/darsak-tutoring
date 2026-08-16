import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/proxy";

/**
 * Next 16 renamed the `middleware` file convention to `proxy`.
 *
 * Two jobs, in order: next-intl resolves the locale, rewrites localised
 * pathnames and sets the locale cookie; then Supabase refreshes the auth
 * session and writes its rotated cookies onto that same response.
 */
const handleI18n = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  return refreshSession(request, response);
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
