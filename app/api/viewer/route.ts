import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth/session";
import { countInboxAttention } from "@/lib/messaging/queries";

/**
 * Who is looking, and how much is waiting for them.
 *
 * Exists because the header cannot ask. `SiteHeader` renders on every page,
 * and reading the session there would mean reading cookies, which opts all
 * ~1,070 prerendered pages out of static generation — the 1,360→243 regression
 * the plan documents. So the answer arrives after hydration instead, and the
 * pages stay static.
 *
 * Under `/api` deliberately: `proxy.ts`'s matcher excludes that prefix, so
 * next-intl does not try to resolve a locale and rewrite `/api/viewer` to
 * `/ar/api/viewer` before this ever runs. Same reason `api/auth/confirm` lives
 * there.
 *
 * Signed-out is a 200 with `signedIn: false`, never a 401. This is called from
 * a landing page; an error status would put a red line in the console of every
 * visitor who happens to hold a stale cookie, and the caller has nothing
 * different to do with it.
 */
export const dynamic = "force-dynamic";

const NO_STORE = {
  // Per-viewer and instantly stale. Vercel's CDN would happily serve one
  // tutor's unread count to the next visitor otherwise.
  "Cache-Control": "no-store, private",
} as const;

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ signedIn: false }, { headers: NO_STORE });
  }

  try {
    const inbox = await countInboxAttention(user.id);
    return NextResponse.json(
      { signedIn: true, inbox: inbox.total },
      { headers: NO_STORE },
    );
  } catch {
    // A database blip must not cost the viewer their account controls. They
    // are signed in either way; only the number is unknown.
    return NextResponse.json(
      { signedIn: true, inbox: 0 },
      { headers: NO_STORE },
    );
  }
}
