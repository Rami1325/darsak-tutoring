"use client";

import { GraduationCap, Loader2, Phone, ShieldCheck, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { authenticate, type AuthState } from "@/lib/auth/actions";
import { formatIsraeliPhone } from "@/lib/auth/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthState = { step: "phone" };

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(
    authenticate,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="step" value={state.step} />
      {/* Where to land afterwards — validated server-side by `safeNext()`. */}
      {next && <input type="hidden" name="next" value={next} />}

      {/*
        Only carry the phone forward once we're past the phone step.
        Rendering it alongside the visible field puts two `phone` entries in the
        FormData, and `get()` returns the first — so a mistyped number would
        stick forever, silently resending to the wrong one no matter what the
        user corrected it to.
      */}
      {state.step !== "phone" && state.phone && (
        <input type="hidden" name="phone" value={state.phone} />
      )}

      <Steps current={state.step} />

      {state.step === "phone" && (
        <Field
          icon={<Phone className="size-4" />}
          label={t("phoneLabel")}
          hint={t("phoneHint")}
        >
          <Input
            key={state.phone ?? "empty"}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            required
            autoFocus
            // Keep what they typed on screen after a failure, in the local
            // format they entered it in.
            defaultValue={
              state.phone ? formatIsraeliPhone(state.phone) : undefined
            }
            placeholder={t("phonePlaceholder")}
            className="h-12 text-base"
          />
        </Field>
      )}

      {state.step === "code" && (
        <Field
          icon={<ShieldCheck className="size-4" />}
          label={t("codeLabel")}
          hint={t("codeSentTo", { phone: state.phone ?? "" })}
        >
          <Input
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            dir="ltr"
            required
            autoFocus
            placeholder={t("codePlaceholder")}
            className="h-12 text-center text-lg tracking-[0.4em]"
          />
        </Field>
      )}

      {state.step === "profile" && (
        <>
          <Field
            icon={<User className="size-4" />}
            label={t("nameLabel")}
            hint={t("nameHint")}
          >
            <Input
              name="fullName"
              required
              autoFocus
              maxLength={120}
              placeholder={t("namePlaceholder")}
              className="h-12 text-base"
            />
          </Field>

          <Field label={t("nameLatinLabel")} hint={t("nameLatinHint")}>
            <Input
              name="fullNameLatin"
              dir="ltr"
              maxLength={120}
              placeholder={t("nameLatinPlaceholder")}
              className="h-12 text-base"
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              {t("roleLabel")}
            </legend>
            <RoleOption
              value="student"
              icon={<GraduationCap className="size-5" />}
              title={t("roleStudent")}
              hint={t("roleStudentHint")}
              defaultChecked
            />
            <RoleOption
              value="tutor"
              icon={<User className="size-5" />}
              title={t("roleTutor")}
              hint={t("roleTutorHint")}
            />
          </fieldset>
        </>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="2xl" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {state.step === "phone" && t("sendCode")}
        {state.step === "code" && t("verify")}
        {state.step === "profile" && t("finish")}
      </Button>

      {state.step === "code" && (
        <button
          type="submit"
          name="step"
          value="phone"
          formNoValidate
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("changeNumber")}
        </button>
      )}
    </form>
  );
}

function Steps({ current }: { current: AuthState["step"] }) {
  const order: AuthState["step"][] = ["phone", "code", "profile"];
  const index = order.indexOf(current);

  return (
    <ol className="flex gap-1.5" aria-hidden>
      {order.map((step, i) => (
        <li
          key={step}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i <= index ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </ol>
  );
}

function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RoleOption({
  value,
  icon,
  title,
  hint,
  defaultChecked,
}: {
  value: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors has-checked:border-primary has-checked:bg-secondary">
      <input
        type="radio"
        name="role"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 size-4 accent-[var(--primary)]"
      />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {hint}
        </span>
      </span>
    </label>
  );
}
