import { FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";

import { usingFixtures } from "@/lib/data/tutors";

/**
 * Visible while the directory is running on fixture data.
 *
 * Demo tutors are indistinguishable from real ones by design — which is exactly
 * why this has to be on screen until a real database is connected. It disappears
 * on its own once `DATABASE_URL` is set.
 */
export function DemoNotice() {
  const t = useTranslations("demo");
  if (!usingFixtures) return null;

  return (
    <div className="border-b border-warning/30 bg-warning/10">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs text-warning-foreground sm:px-6">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        {t("banner")}
      </p>
    </div>
  );
}
