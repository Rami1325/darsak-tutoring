"use client";

import {
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  MailCheck,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Link } from "@/i18n/navigation";
import { authenticate, type AuthState } from "@/lib/auth/actions";
import { formatIsraeliPhone } from "@/lib/auth/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthState = { step: "phone", method: "phone" };
const resumeState: AuthState = { step: "profile", method: "email" };

export function LoginForm({
  next,
  /** A session with no profile behind it — pick up at name and role. */
  resumeProfile = false,
}: {
  next?: string;
  resumeProfile?: boolean;
}) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(
    authenticate,
    resumeProfile ? resumeState : initialState,
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

      {/*
        The door chooser, shown only on the first step of either door — once a
        code is in flight or a name is being typed, switching would throw that
        away. Both are submit buttons rather than client state, so the choice
        survives with JavaScript unavailable, same as the rest of this form.
      */}
      {(state.step === "phone" || state.step === "email") && (
        <div
          role="group"
          aria-label={t("methodLabel")}
          className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
        >
          <MethodTab
            step="phone"
            active={state.step === "phone"}
            icon={<Phone className="size-4" />}
            label={t("methodPhone")}
          />
          <MethodTab
            step="email"
            active={state.step === "email"}
            icon={<Mail className="size-4" />}
            label={t("methodEmail")}
          />
        </div>
      )}

      {state.step !== "confirm" && <Steps state={state} />}

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

      {state.step === "email" && (
        <>
          <input
            type="hidden"
            name="intent"
            value={state.intent === "signup" ? "signup" : "signin"}
          />

          <Field
            icon={<Mail className="size-4" />}
            label={t("emailLabel")}
            hint={
              state.intent === "signup" ? t("emailSignUpHint") : t("emailHint")
            }
          >
            <Input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              required
              autoFocus
              defaultValue={state.email}
              placeholder={t("emailPlaceholder")}
              className="h-12 text-base"
            />
          </Field>

          <Field
            icon={<KeyRound className="size-4" />}
            label={t("passwordLabel")}
            hint={state.intent === "signup" ? t("passwordHint") : undefined}
            // Only on the sign-in side: there is nothing to have forgotten
            // while you are in the middle of choosing one.
            action={
              state.intent === "signup" ? undefined : (
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t("forgotLink")}
                </Link>
              )
            }
          >
            <Input
              name="password"
              type="password"
              // `new-password` is what tells a password manager to offer to
              // generate and store one; `current-password` makes it autofill.
              autoComplete={
                state.intent === "signup" ? "new-password" : "current-password"
              }
              dir="ltr"
              required
              minLength={8}
              maxLength={72}
              placeholder={t("passwordPlaceholder")}
              className="h-12 text-base"
            />
          </Field>
        </>
      )}

      {state.step === "confirm" && (
        <div className="rounded-2xl border border-success/30 bg-success/10 px-5 py-6 text-center">
          <MailCheck className="mx-auto size-8 text-success" aria-hidden />
          <p className="mt-3 font-medium">{t("confirmTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("confirmBody", { email: state.email ?? "" })}
          </p>
        </div>
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

      {state.step !== "confirm" && (
        <Button type="submit" size="2xl" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {state.step === "phone" && t("sendCode")}
          {state.step === "code" && t("verify")}
          {state.step === "email" &&
            (state.intent === "signup" ? t("createAccount") : t("signIn"))}
          {state.step === "profile" && t("finish")}
        </Button>
      )}

      {state.step === "email" && (
        <button
          type="submit"
          name="switch"
          value="intent"
          formNoValidate
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {state.intent === "signup" ? t("haveAccount") : t("noAccount")}
        </button>
      )}

      {state.step === "code" && (
        <button
          type="submit"
          name="switch"
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

/**
 * One door.
 *
 * A submit button carrying `switch`, not a client-side tab: the form already
 * works without JavaScript everywhere else, and the first thing a visitor does
 * on this page should not be the one thing that needs it.
 */
function MethodTab({
  step,
  active,
  icon,
  label,
}: {
  step: "phone" | "email";
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="submit"
      name="switch"
      value={step}
      formNoValidate
      aria-pressed={active}
      className={cn(
        "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * The progress bar has a different length per door — three segments for the
 * OTP, two for a password — so it counts the steps that door actually has
 * rather than showing an email signup as permanently one-third done.
 */
function Steps({ state }: { state: AuthState }) {
  const order: AuthState["step"][] =
    state.method === "email"
      ? ["email", "profile"]
      : ["phone", "code", "profile"];
  const index = order.indexOf(state.step);

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
  action,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  /** Optional link sitting opposite the label — "forgot password?". */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {label}
        </Label>
        {action}
      </div>
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
