"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { removePushSubscription } from "@/lib/notifications/actions";

/**
 * Sign out, and take this device's push subscription with it.
 *
 * A client component purely because of that second half. A push subscription
 * is identified by an endpoint only the browser knows, so the server cannot
 * clear the right one on its own — and clearing *all* of them would silence
 * somebody's phone because they signed out on a laptop.
 *
 * It matters here more than it would elsewhere. Shared family phones are
 * normal in this market, and a subscription that outlives its session means
 * the next person to sign in receives notifications naming the last person's
 * students. That is the same rule as never showing a phone number: what one
 * account knows must not spill into the next.
 *
 * Best effort, and deliberately so — if the browser has no subscription, or
 * revoking fails, signing out still happens. A sign-out button that can be
 * blocked by a notification API is worse than a stale row.
 */
export function SignOutButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = await registration?.pushManager.getSubscription();

          if (subscription) {
            await removePushSubscription(subscription.endpoint);
            await subscription.unsubscribe();
          }
        }
      } catch {
        // Fall through to the sign-out itself.
      }

      await signOut();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={handleClick}
    >
      <LogOut className="size-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
