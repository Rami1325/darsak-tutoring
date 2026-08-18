"use client";

import { useEffect, useState } from "react";

import {
  AccountControls,
  type AccountLabels,
} from "@/components/site/account-controls";

/**
 * Is there plausibly a session, without asking the server?
 *
 * `@supabase/ssr` stores the session in cookies named
 * `sb-<project-ref>-auth-token`, chunked as `.0`, `.1` when the token outgrows
 * one cookie, and they are readable from script by design — the browser client
 * reads them the same way. So a signed-out visitor, which on a directory site
 * means nearly everyone plus every crawler, can be recognised in the browser
 * and cost the platform nothing.
 *
 * The probe is deliberately loose. It proves nothing about whether the session
 * is valid; `/api/viewer` still decides that with `getUser()`. If the naming
 * ever changes the badge quietly stops appearing on static pages, which is a
 * degradation rather than a break — and the seven dynamic routes still render
 * the same controls from the server.
 */
function hasSessionCookie() {
  return document.cookie
    .split("; ")
    .some((entry) => /^sb-.+-auth-token(\.\d+)?=/.test(entry));
}

/**
 * The header's account area on statically generated pages.
 *
 * `SiteHeader` cannot resolve the viewer itself: reading the session means
 * reading cookies, and one cookie read opts every page carrying the header out
 * of static generation. That is the 1,360→243 regression the plan documents,
 * and it is why the `account` slot exists at all.
 *
 * The consequence, until now, was that `AccountMenu` rendered on exactly seven
 * routes. On the other ~1,070 — the homepage, every landing page, `/tutors`, a
 * tutor's own public profile — a signed-in tutor with five waiting leads saw a
 * "sign in" button and no indication that anything had happened. Since phone
 * numbers were cut, the in-app thread is the only contact channel there is, so
 * that gap was most of the notification problem.
 *
 * This closes it without touching a single prerendered byte: the static HTML
 * still ships the signed-out controls, and the browser swaps them after
 * hydration if it turns out somebody is signed in.
 */
export function ViewerControls({
  labels,
  children,
}: {
  labels: AccountLabels;
  /** The signed-out controls, rendered until proven otherwise. */
  children: React.ReactNode;
}) {
  const [inbox, setInbox] = useState<number | null>(null);

  useEffect(() => {
    if (!hasSessionCookie()) return;

    const abort = new AbortController();

    fetch("/api/viewer", { signal: abort.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { signedIn?: boolean; inbox?: number } | null) => {
        if (data?.signedIn) setInbox(data.inbox ?? 0);
      })
      .catch(() => {
        // Aborted, offline, or the endpoint is unreachable. The signed-out
        // controls stay put; there is nothing here worth an error message.
      });

    return () => abort.abort();
  }, []);

  return inbox === null ? (
    <>{children}</>
  ) : (
    <AccountControls labels={labels} inbox={inbox} />
  );
}
