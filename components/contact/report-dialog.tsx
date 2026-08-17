"use client";

import { Flag, Loader2, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { reportTarget, type ReportState } from "@/lib/contact/actions";

/**
 * Report a profile or a conversation.
 *
 * Deliberately low-friction and quiet: one field, no categories to choose from,
 * no confirmation that names the person reported. Trust in online transactions
 * is the binding constraint in this market — 36% use digital government
 * services against 60% nationally — and a reporting flow that feels like an
 * accusation gets used by nobody.
 */
export function ReportDialog({
  targetType,
  targetRef,
  triggerLabel,
}: {
  targetType: "tutor" | "conversation";
  /** A tutor's public slug, or a conversation id. Resolved server-side. */
  targetRef: string;
  triggerLabel?: string;
}) {
  const t = useTranslations("safety");
  const [state, action, pending] = useActionState<ReportState, FormData>(
    reportTarget,
    {},
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground" />
        }
      >
        <Flag className="size-3.5" aria-hidden />
        {triggerLabel ?? t("report")}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" aria-hidden />
            {t("reportTitle")}
          </DialogTitle>
          <DialogDescription>{t("reportBody")}</DialogDescription>
        </DialogHeader>

        {state.ok ? (
          <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            {t("reportThanks")}
          </p>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetRef" value={targetRef} />

            <Textarea
              name="reason"
              rows={4}
              required
              minLength={10}
              maxLength={1000}
              placeholder={t("reportPlaceholder")}
              className="text-base"
            />

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              size="xl"
              variant="destructive"
              className="w-full"
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("reportSubmit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
