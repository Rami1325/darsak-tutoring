import { CalendarRange, LayoutDashboard, MessageSquare } from "lucide-react";

import { SignOutButton } from "@/components/site/sign-out-button";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export type AccountLabels = {
  dashboard: string;
  schedule: string;
  messages: string;
  signOut: string;
};

/**
 * The signed-in header controls.
 *
 * Neither `"use client"` nor `async`, deliberately: this same markup renders
 * inside `AccountMenu` on the seven dynamic routes, where the server already
 * knows who the viewer is, and inside `ViewerControls` on the ~1,070 static
 * ones, where the browser only finds out after hydration. One component, so the
 * header cannot look like two different products either side of a navigation.
 *
 * Labels arrive as props rather than through `useTranslations`, so the `nav`
 * namespace never has to be added to the root layout's client payload — the
 * saving that note in `PUBLIC_CLIENT_NAMESPACES` is protecting.
 */
export function AccountControls({
  labels,
  inbox,
  showDashboard = true,
}: {
  labels: AccountLabels;
  /** Unread messages plus unopened leads. See `countInboxAttention`. */
  inbox: number;
  showDashboard?: boolean;
}) {
  return (
    <>
      {showDashboard && (
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
          render={<Link href="/dashboard" />}
        >
          <LayoutDashboard className="size-4" aria-hidden />
          {labels.dashboard}
        </Button>
      )}

      {/* Icon-only below `sm`: four labelled controls do not fit a 360px
          header. `sr-only` rather than `hidden`, so the button keeps its name
          for a screen reader at the width where it has lost its visible one. */}
      <Button variant="ghost" size="sm" render={<Link href="/schedule" />}>
        <CalendarRange className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{labels.schedule}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="relative"
        render={<Link href="/messages" />}
      >
        <MessageSquare className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{labels.messages}</span>
        {inbox > 0 && (
          <span className="numeric grid min-w-4 place-items-center rounded-full bg-primary px-1 py-px text-[0.625rem] font-semibold text-primary-foreground">
            {inbox > 99 ? "99+" : inbox}
          </span>
        )}
      </Button>

      <SignOutButton label={labels.signOut} />
    </>
  );
}
