import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/**
 * Hands a subtree exactly the translation namespaces its Client Components
 * need.
 *
 * The root layout only ships the namespaces public pages use. Pages with their
 * own client surfaces — the login form, the onboarding wizard — nest one of
 * these so their copy travels with them instead of with all ~1,300 landing
 * pages.
 */
export async function ScopedMessages({
  namespaces,
  children,
}: {
  namespaces: readonly string[];
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const scoped = Object.fromEntries(
    namespaces
      .filter((key) => key in messages)
      .map((key) => [key, messages[key as keyof typeof messages]]),
  );

  return (
    <NextIntlClientProvider messages={scoped}>
      {children}
    </NextIntlClientProvider>
  );
}
