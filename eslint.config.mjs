import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    // Vendored shadcn primitives are exempt: several expose a deliberately
    // physical API (Sheet's `side="left"` means the left edge of the viewport)
    // and already carry `rtl:` variants for the parts that need flipping.
    ignores: ["components/ui/**"],
    rules: {
      /**
       * Physical direction utilities are the single biggest source of RTL bugs.
       * Two of our three locales are right-to-left, and the default one is
       * Arabic — so `pl-4` is a defect, not a style preference.
       *
       * Vertical utilities (top-, bottom-, -translate-y-) are unaffected by
       * direction and stay allowed.
       */
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/(^|\\s|:)(-?p[lr]-|-?m[lr]-|text-(left|right)|border-[lr](-|$|\\s)|-?(left|right)-|rounded-[tb][lr]-)/]",
          message:
            "Use logical properties for RTL: ps-/pe-, ms-/me-, text-start/text-end, border-s/border-e, start-/end-, rounded-ss/se/es/ee.",
        },
      ],
    },
  },
]);

export default eslintConfig;
