"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/notifications/actions";

export type PushLabels = {
  title: string;
  body: string;
  enable: string;
  enabled: string;
  disable: string;
  blocked: string;
  unsupported: string;
  installFirst: string;
};

type State =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "blocked"
  | "off"
  | "on"
  | "working";

/**
 * The push service hands back a base64url key; `applicationServerKey` wants
 * bytes. Neither `atob` nor the subscription API will tell you the conversion
 * was wrong — the subscribe call just rejects with a generic error.
 */
function urlBase64ToUint8Array(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * iOS delivers Web Push only to a PWA that has been added to the home screen.
 *
 * Not a quirk to route around — asking for permission in Safari there produces
 * an error rather than a prompt, so the honest answer is to say what to do
 * first. About a quarter of this audience is mobile-only, so this is a real
 * branch and not an edge case.
 */
function needsInstallFirst() {
  const iOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!iOS) return false;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;

  return !standalone;
}

async function detectState(): Promise<State> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  if (needsInstallFirst()) return "needs-install";
  if (Notification.permission === "denied") return "blocked";

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ? "on" : "off";
  } catch {
    return "off";
  }
}

/**
 * Turn on the one notification channel that needs no provider.
 *
 * Deliberately behind a button and never asked for on page load. A permission
 * prompt fired at somebody who has not yet worked out what the site is gets
 * denied, and a denial is close to permanent — the browser stops offering, and
 * the only way back is a settings screen most people cannot find. So it is
 * asked for on the dashboard, where the person has already signed up to be a
 * tutor and the sentence "don't miss a request" means something to them.
 */
export function PushToggle({
  publicKey,
  labels,
}: {
  publicKey: string;
  labels: PushLabels;
}) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let cancelled = false;

    // One async resolve rather than a series of synchronous early returns:
    // setState called straight from an effect body is a double render, and the
    // React compiler's lint rule refuses it — correctly, as it did for the
    // draft-restoring effect on the inquiry form.
    void detectState().then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setState("working");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        // Required, and required to be true: a push that shows nothing is
        // treated as abuse and eventually costs the site its permission.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent.slice(0, 300),
      });

      if ("error" in result) {
        // The row was refused, so the browser must not go on believing it is
        // subscribed — otherwise nothing ever arrives and the control says it
        // is on.
        await subscription.unsubscribe();
        setState("off");
        return;
      }

      setState("on");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        // Server first: a browser that has unsubscribed while the row survives
        // means every later send burns a request on a dead endpoint.
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
    } catch {
      // Fall through — the control reflects what we last managed to do.
    }

    setState("off");
  }

  if (state === "checking") return null;

  const message =
    state === "unsupported"
      ? labels.unsupported
      : state === "needs-install"
        ? labels.installFirst
        : state === "blocked"
          ? labels.blocked
          : state === "on"
            ? labels.enabled
            : labels.body;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {state === "on" ? (
          <Bell className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        ) : (
          <BellOff
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold tracking-tight">{labels.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>

          {(state === "off" || state === "on" || state === "working") && (
            <Button
              size="xl"
              variant={state === "on" ? "outline" : "default"}
              className="mt-4"
              disabled={state === "working"}
              onClick={state === "on" ? disable : enable}
            >
              {state === "working" && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              {state === "on" ? labels.disable : labels.enable}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
