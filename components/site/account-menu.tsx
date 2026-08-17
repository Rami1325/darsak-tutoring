import {
  CalendarRange,
  LayoutDashboard,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/actions";
import { getAuthUser } from "@/lib/auth/session";
import { countUnreadMessages } from "@/lib/messaging/queries";

/**
 * Rendered into `SiteHeader`'s `account` slot by the dynamic pages — dashboard,
 * onboarding, messages, inquiry. Keeping it out of the header itself is what
 * lets the rest of the site stay statically generated.
 */
export async function AccountMenu({
  showDashboard = true,
}: {
  showDashboard?: boolean;
}) {
  const t = await getTranslations("nav");
  const auth = await getTranslations("auth");

  const user = await getAuthUser();
  const unread = user ? await countUnreadMessages(user.id) : 0;

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
          {t("dashboard")}
        </Button>
      )}

      {/* Icon-only below `sm`: four labelled controls do not fit a 360px
          header. `sr-only` rather than `hidden`, so the button keeps its name
          for a screen reader at the width where it has lost its visible one. */}
      <Button variant="ghost" size="sm" render={<Link href="/schedule" />}>
        <CalendarRange className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{t("schedule")}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="relative"
        render={<Link href="/messages" />}
      >
        <MessageSquare className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{t("messages")}</span>
        {unread > 0 && (
          <span className="numeric grid min-w-4 place-items-center rounded-full bg-primary px-1 py-px text-[0.625rem] font-semibold text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">{auth("signOut")}</span>
        </Button>
      </form>
    </>
  );
}
