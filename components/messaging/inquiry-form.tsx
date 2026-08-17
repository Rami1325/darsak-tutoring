"use client";

import { Loader2, LogIn, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { submitInquiry, type InquiryState } from "@/lib/messaging/actions";
import { cn } from "@/lib/utils";

export type InquiryOption = { value: string; label: string };

export type InquiryFormProps = {
  tutorSlug: string;
  subjects: InquiryOption[];
  localities: InquiryOption[];
  levels: InquiryOption[];
  teachesOnline: boolean;
  teachesInPerson: boolean;
  source: string;
  defaults: { subject?: string; level?: string; mode?: string };
  /** Absent when signed out — the form then routes through sign-in instead. */
  signedIn: boolean;
  /** Resolved, locale-prefixed path to return to after signing in. */
  next: string;
};

/**
 * The inquiry form — the product's primary conversion event.
 *
 * Sending requires an account, but the form is rendered for signed-out visitors
 * too, and what they typed survives the trip through phone verification. A
 * marketplace that shows a login wall in place of the form loses the lead
 * before the visitor knows what it was going to ask; one that shows the form
 * and then discards a typed message loses them at the last step, which is
 * worse. The draft lives in `sessionStorage` — same tab, same origin, gone when
 * the tab closes — so nothing personal is written to a cookie or to our server
 * before there is an account to attach it to.
 */
export function InquiryForm({
  tutorSlug,
  subjects,
  localities,
  levels,
  teachesOnline,
  teachesInPerson,
  source,
  defaults,
  signedIn,
  next,
}: InquiryFormProps) {
  const t = useTranslations("inquiry");
  const [state, action, pending] = useActionState<InquiryState, FormData>(
    submitInquiry,
    {},
  );

  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = `darsak:inquiry:${tutorSlug}`;

  const defaultMode =
    defaults.mode === "in_person" && teachesInPerson
      ? "in_person"
      : teachesOnline
        ? "online"
        : "in_person";

  /*
   * Restore a draft left behind before signing in, then drop it so a later
   * visit starts clean.
   *
   * Every field is uncontrolled, so this writes DOM values and nothing else —
   * no `setState` in an effect, and no state to fall out of sync with what the
   * user is looking at. Which field is visible is decided in CSS below for the
   * same reason.
   */
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const raw = window.sessionStorage.getItem(draftKey);
    if (!raw) return;
    window.sessionStorage.removeItem(draftKey);

    try {
      const saved = JSON.parse(raw) as Record<string, string>;
      for (const [name, value] of Object.entries(saved)) {
        const field = form.elements.namedItem(name);

        if (field instanceof RadioNodeList) {
          field.value = value;
        } else if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLSelectElement
        ) {
          field.value = value;
        }
      }
    } catch {
      // A corrupted draft is not worth telling anyone about.
    }
  }, [draftKey]);

  function saveDraft() {
    const form = formRef.current;
    if (!form) return;

    const draft: Record<string, string> = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string") draft[key] = value;
    }
    window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }

  return (
    <form
      ref={formRef}
      action={signedIn ? action : undefined}
      className="inquiry-form space-y-5"
    >
      <input type="hidden" name="tutorSlug" value={tutorSlug} />
      <input type="hidden" name="source" value={source} />

      {subjects.length > 0 && (
        <Field label={t("subjectLabel")} htmlFor="subjectSlug">
          <NativeSelect
            id="subjectSlug"
            name="subjectSlug"
            required
            defaultValue={defaults.subject ?? ""}
          >
            <option value="">{t("choose")}</option>
            {subjects.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <Field label={t("levelLabel")} htmlFor="level" hint={t("levelHint")}>
        <NativeSelect id="level" name="level" defaultValue={defaults.level ?? ""}>
          <option value="">{t("levelAny")}</option>
          {levels.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("modeLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {teachesOnline && (
            <ModeOption
              value="online"
              label={t("modeOnline")}
              defaultChecked={defaultMode === "online"}
            />
          )}
          {teachesInPerson && (
            <ModeOption
              value="in_person"
              label={t("modeInPerson")}
              defaultChecked={defaultMode === "in_person"}
            />
          )}
        </div>
      </fieldset>

      {/* Shown for in-person lessons only — see `.locality-field` in globals.css. */}
      {localities.length > 0 && (
        <div className="locality-field">
          <Field label={t("localityLabel")} htmlFor="localitySlug">
            <NativeSelect id="localitySlug" name="localitySlug" defaultValue="">
              <option value="">{t("choose")}</option>
              {localities.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      )}

      <Field label={t("messageLabel")} htmlFor="message" hint={t("messageHint")}>
        <Textarea
          id="message"
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={2000}
          placeholder={t("messagePlaceholder")}
          className="text-base"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("budgetLabel")} htmlFor="budgetMax" hint={t("budgetHint")}>
          <Input
            id="budgetMax"
            name="budgetMax"
            type="number"
            inputMode="numeric"
            min={20}
            max={2000}
            dir="ltr"
            className="h-12 text-base"
          />
        </Field>

        <Field label={t("timesLabel")} htmlFor="preferredTimes">
          <Input
            id="preferredTimes"
            name="preferredTimes"
            maxLength={200}
            placeholder={t("timesPlaceholder")}
            className="h-12 text-base"
          />
        </Field>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      {signedIn ? (
        <Button type="submit" size="2xl" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Send className="size-5" aria-hidden />
          )}
          {t("send")}
        </Button>
      ) : (
        <>
          {/*
            A link, not a button: without JavaScript it still reaches sign-in.
            The click handler only adds the part that needs JavaScript anyway —
            keeping what was typed.
          */}
          <Button
            size="2xl"
            className="w-full"
            render={
              <Link href={{ pathname: "/login", query: { next } }} onClick={saveDraft} />
            }
          >
            <LogIn className="size-5" aria-hidden />
            {t("signInToSend")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("signInHint")}
          </p>
        </>
      )}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Native `<select>`, matching the filter bar: the OS picker is the better
 * control on a phone, and it works before hydration.
 */
function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-lg border border-border bg-card px-3 text-base",
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

/** Selected styling comes from `:has(:checked)`, so no state is involved. */
function ModeOption({
  value,
  label,
  defaultChecked,
}: {
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-secondary has-checked:text-secondary-foreground">
      <input
        type="radio"
        name="mode"
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}
