"use client";

import { Loader2, Mail, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type ResetState } from "@/lib/auth/actions";

const initialState: ResetState = {};

/**
 * Asking for a reset link.
 *
 * The success state says "if that address has an account" rather than "sent",
 * and it is shown for an unknown address too. Anything else turns this form
 * into a way to ask whether a particular person teaches here.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  if (state.sent) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 px-5 py-6 text-center">
        <MailCheck className="mx-auto size-8 text-success" aria-hidden />
        <p className="mt-3 font-medium">{t("resetSentTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("resetSentBody", { email: state.email ?? "" })}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <span className="text-muted-foreground">
            <Mail className="size-4" />
          </span>
          {t("emailLabel")}
        </Label>
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
        <p className="text-xs text-muted-foreground">{t("forgotHint")}</p>
      </div>

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
        {t("sendResetLink")}
      </Button>
    </form>
  );
}
