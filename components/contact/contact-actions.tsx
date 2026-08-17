"use client";

import { Loader2, MessageCircle, Phone, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatIsraeliPhone } from "@/lib/auth/phone";
import { revealPhone, type RevealState } from "@/lib/contact/actions";
import { telUrl, whatsappShareUrl, whatsappUrl } from "@/lib/contact/whatsapp";

/**
 * Contact controls on a tutor's public profile.
 *
 * A Client Component on purpose: the profile page is statically generated for
 * every published tutor, and reading the session there — even to decide which
 * button to show — would opt the whole route out of static rendering. So the
 * page ships one set of markup for everyone and this component resolves the
 * viewer at click time.
 *
 * Revealing a number requires an account. That is not gratuitous friction: an
 * open endpoint here is a scraper for every tutor's personal mobile, and a
 * tutor whose number lands on a spam list does not come back.
 */
export function ContactActions({
  tutorSlug,
  tutorName,
  profileUrl,
  next,
}: {
  tutorSlug: string;
  tutorName: string;
  /** Absolute URL, for the WhatsApp share text. */
  profileUrl: string;
  /** Where sign-in should return to — this profile. */
  next: string;
}) {
  const t = useTranslations("contact");
  const [state, setState] = useState<RevealState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  function onReveal() {
    startTransition(async () => {
      setState(await revealPhone(tutorSlug));
    });
  }

  const phone = state.status === "revealed" ? state.phone : undefined;
  const waContact = phone
    ? whatsappUrl(phone, t("waGreeting", { name: tutorName }))
    : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {phone ? (
          <>
            <Button
              size="2xl"
              variant="outline"
              className="w-full sm:w-auto"
              render={<a href={telUrl(phone)} />}
            >
              <Phone className="size-5" aria-hidden />
              <span className="numeric">{formatIsraeliPhone(phone)}</span>
            </Button>
            {waContact && (
              <Button
                size="2xl"
                variant="outline"
                className="w-full sm:w-auto"
                render={
                  <a href={waContact} target="_blank" rel="noopener noreferrer" />
                }
              >
                <MessageCircle className="size-5" aria-hidden />
                {t("openWhatsApp")}
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            size="2xl"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onReveal}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Phone className="size-5" aria-hidden />
            )}
            {t("showPhone")}
          </Button>
        )}

        <Button
          size="2xl"
          variant="ghost"
          className="w-full sm:w-auto"
          render={
            <a
              href={whatsappShareUrl(
                t("shareText", { name: tutorName, url: profileUrl }),
              )}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <Share2 className="size-5" aria-hidden />
          {t("share")}
        </Button>
      </div>

      {state.status === "needsAuth" && (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          {t("signInToSeePhone")}{" "}
          <Link
            href={{ pathname: "/login", query: { next } }}
            className="font-medium underline underline-offset-4"
          >
            {t("signIn")}
          </Link>
        </p>
      )}

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
