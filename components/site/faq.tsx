import { ChevronDown } from "lucide-react";

export type FaqItem = { question: string; answer: string };

/**
 * Built on `<details>`/`<summary>`: zero JavaScript, keyboard accessible by
 * default, and the content is in the DOM for crawlers even when collapsed —
 * which matters because these blocks exist to rank for question queries.
 *
 * Pair with `faqJsonLd()` on the same items.
 */
export function Faq({ title, items }: { title: string; items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((item) => (
          <details key={item.question} className="group px-4 py-1 sm:px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-start font-medium outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
