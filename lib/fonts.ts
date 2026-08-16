import {
  IBM_Plex_Sans,
  IBM_Plex_Sans_Arabic,
  IBM_Plex_Sans_Hebrew,
} from "next/font/google";

import type { Locale } from "@/i18n/routing";

/**
 * One type family across all three scripts.
 *
 * IBM Plex is unusual in shipping Arabic, Hebrew and Latin cuts drawn to
 * matched metrics and weights — so the product looks like one product in every
 * locale instead of three different sites. Each variant binds to the same
 * `--font-sans` custom property; the layout applies exactly one per request, so
 * a visitor never downloads a script they can't read.
 */

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const hebrew = IBM_Plex_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const latin = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const fontByLocale: Record<Locale, string> = {
  ar: arabic.variable,
  he: hebrew.variable,
  en: latin.variable,
};
