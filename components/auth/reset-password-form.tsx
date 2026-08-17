"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type NewPasswordState } from "@/lib/auth/actions";

const initialState: NewPasswordState = {};

/**
 * Two password fields, both `new-password`.
 *
 * The confirmation is checked on the server rather than in the browser: this
 * form has no JavaScript requirement anywhere else, and a mismatch caught only
 * by client script would let a locked-out person set a password with a typo in
 * it — the one mistake this whole flow exists to recover from.
 */
export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={action} className="space-y-5">
      <Field label={t("newPasswordLabel")} hint={t("passwordHint")}>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          required
          autoFocus
          minLength={8}
          maxLength={72}
          placeholder={t("passwordPlaceholder")}
          className="h-12 text-base"
        />
      </Field>

      <Field label={t("confirmPasswordLabel")}>
        <Input
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          required
          minLength={8}
          maxLength={72}
          placeholder={t("passwordPlaceholder")}
          className="h-12 text-base"
        />
      </Field>

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
        {t("savePassword")}
      </Button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        <span className="text-muted-foreground">
          <KeyRound className="size-4" />
        </span>
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
