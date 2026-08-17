"use client";

import { Loader2, Send } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useOptimistic,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  markConversationRead,
  sendMessage,
  type MessageState,
} from "@/lib/messaging/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type ThreadLabels = {
  placeholder: string;
  send: string;
  blocked: string;
};

/**
 * The live parts of a conversation.
 *
 * The timeline itself arrives as `children`, already rendered on the server —
 * which keeps message formatting, subject names and the whole translation
 * catalogue off the client. This component owns only the three things that have
 * to run in the browser: the realtime subscription, marking messages read, and
 * echoing a sent message immediately.
 *
 * That last one is not polish. A quarter of this audience is mobile-only, often
 * on a constrained connection, and a send button that appears to do nothing for
 * two seconds gets pressed again.
 */
export function ThreadLive({
  conversationId,
  canSend,
  labels,
  children,
}: {
  conversationId: string;
  canSend: boolean;
  labels: ThreadLabels;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [state, action, pending] = useActionState<MessageState, FormData>(
    sendMessage,
    {},
  );

  const [sending, addSending] = useOptimistic<string[], string>(
    [],
    (current, body) => [...current, body],
  );

  // Mark read on open, and again whenever something new lands while the thread
  // is on screen.
  useEffect(() => {
    startTransition(() => {
      void markConversationRead(conversationId);
    });
  }, [conversationId, children]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    void (async () => {
      /*
       * Recover the session before subscribing.
       *
       * Realtime authorises a subscription with whatever token the socket is
       * carrying, and the browser client starts out carrying the anon key while
       * it reads the session out of cookies — which is asynchronous. Subscribe
       * before that lands and the channel connects, reports SUBSCRIBED, and
       * then delivers nothing at all, because `anon` has no grant on `messages`.
       * Awaiting `getSession()` first and then `setAuth()` with no argument
       * hands Realtime the user's JWT while leaving the client in auto-refresh
       * mode, so the subscription survives a token rotation.
       */
      await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth();
      if (cancelled) return;

      channel = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => router.refresh(),
        )
        .subscribe((status, error) => {
          // Silence is this feature's failure mode, so say the status out loud
          // while developing rather than discovering it in production.
          if (process.env.NODE_ENV !== "production") {
            console.log(`[darsak realtime] ${status}`, error ?? "");
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  // Follow the conversation down as it grows, the way every chat does.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [children, sending.length]);

  return (
    <>
      <div className="space-y-3">
        {children}

        {sending.map((body, index) => (
          <div
            key={`pending-${index}`}
            className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm bg-primary/70 px-4 py-2.5 text-sm text-primary-foreground opacity-70"
          >
            <p className="whitespace-pre-line break-words">{body}</p>
            <Loader2 className="mt-1 size-3 animate-spin" aria-hidden />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {canSend ? (
        <form
          ref={formRef}
          action={(formData) => {
            const body = String(formData.get("body") ?? "").trim();
            if (!body) return;
            // Form actions already run inside a transition, which is what makes
            // the optimistic entry stick until the server round trip settles.
            addSending(body);
            formRef.current?.reset();
            action(formData);
          }}
          className="sticky bottom-0 -mx-4 mt-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
        >
          <input type="hidden" name="conversationId" value={conversationId} />

          {state.error && (
            <p role="alert" className="mb-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              name="body"
              rows={1}
              required
              maxLength={4000}
              placeholder={labels.placeholder}
              className="max-h-40 min-h-11 flex-1 rounded-xl text-base"
              onKeyDown={(event) => {
                // Enter sends on a keyboard; Shift+Enter and every soft
                // keyboard's return key still insert a newline.
                if (event.key === "Enter" && !event.shiftKey && !event.altKey) {
                  const isTouch = window.matchMedia("(pointer: coarse)").matches;
                  if (isTouch) return;
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Button
              type="submit"
              size="xl"
              className="size-11 shrink-0 px-0"
              disabled={pending}
              aria-label={labels.send}
            >
              {pending ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-5" aria-hidden />
              )}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {labels.blocked}
        </p>
      )}
    </>
  );
}
