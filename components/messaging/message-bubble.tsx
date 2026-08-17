import { Check, CheckCheck } from "lucide-react";

import type { Locale } from "@/i18n/routing";
import { formatTimestamp } from "@/lib/format";
import type { ThreadMessage } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

/**
 * One message.
 *
 * Own messages sit on the inline-end edge and the counterpart's on the
 * inline-start — logical properties, so the whole conversation mirrors
 * correctly in Arabic and Hebrew without a second set of styles.
 */
export function MessageBubble({
  message,
  viewerId,
  locale,
  readLabel,
  sentLabel,
}: {
  message: ThreadMessage;
  viewerId: string;
  locale: Locale;
  readLabel: string;
  sentLabel: string;
}) {
  const own = message.senderId === viewerId;

  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
        own
          ? "ms-auto rounded-ee-sm bg-primary text-primary-foreground"
          : "me-auto rounded-es-sm bg-muted text-foreground",
      )}
    >
      <p className="whitespace-pre-line break-words leading-relaxed">
        {message.body}
      </p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-[0.6875rem]",
          own ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        <time dateTime={message.createdAt.toISOString()} className="numeric">
          {formatTimestamp(message.createdAt, locale)}
        </time>
        {own &&
          (message.readAt ? (
            <CheckCheck className="size-3.5" aria-label={readLabel} />
          ) : (
            <Check className="size-3.5" aria-label={sentLabel} />
          ))}
      </p>
    </div>
  );
}
