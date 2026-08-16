import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

/**
 * Next 16 renamed the `middleware` file convention to `proxy`. next-intl's
 * factory is unchanged — it resolves the locale, redirects `/` to `/ar`, and
 * sets the locale cookie.
 */
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, and anything with a file extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
