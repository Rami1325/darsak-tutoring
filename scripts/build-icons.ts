import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import sharp from "sharp";

import { BRAND_COLORS, brandMarkSvg } from "../lib/brand/mark";

/**
 * Generates every icon the browser, the manifest and iOS ask for, from the one
 * mark in `lib/brand/mark.ts`.
 *
 * The outputs are committed — the build needs them and Vercel does not run
 * this — but they are generated rather than drawn, so the favicon cannot drift
 * away from the header logo and changing a brand colour does not mean opening
 * a design tool.
 *
 *   npm run build:icons
 */
const ROOT = join(import.meta.dirname, "..");

type Target = {
  path: string;
  px: number;
  /** Draw the tile's own corners. Wrong wherever the platform masks. */
  rounded?: boolean;
  /** Inset the glyph to 60% for Android's maskable crop. */
  safeZone?: boolean;
  /** Monochrome, tile-less: Android masks a notification badge to one colour. */
  badge?: boolean;
  /**
   * Composite onto the tile colour instead of keeping alpha.
   *
   * Only where transparency is actively wrong: iOS paints it black, and a
   * maskable icon must bleed to the edges by definition. The two `purpose:
   * "any"` icons keep their alpha, because that is what makes the rounded
   * corners corners rather than teal squares.
   */
  opaque?: boolean;
};

const TARGETS: Target[] = [
  // Next's metadata file conventions: picked up from `app/` and linked
  // automatically, so there are no <link> tags to keep in sync.
  { path: "app/icon.svg", px: 32, rounded: true },
  { path: "app/apple-icon.png", px: 180, opaque: true },

  // Referenced by the manifest, so these need stable public URLs.
  { path: "public/icon-192.png", px: 192, rounded: true },
  { path: "public/icon-512.png", px: 512, rounded: true },
  { path: "public/icon-maskable-512.png", px: 512, safeZone: true, opaque: true },

  // Status-bar badge on Android. Stays transparent: the platform masks it.
  { path: "public/icon-badge-96.png", px: 96, badge: true },
];

async function main() {
  for (const target of TARGETS) {
    const svg = brandMarkSvg({
      px: target.px,
      rounded: target.rounded ?? false,
      safeZone: target.safeZone ?? false,
      badge: target.badge ?? false,
    });
    const file = join(ROOT, target.path);

    await mkdir(dirname(file), { recursive: true });

    if (target.path.endsWith(".svg")) {
      await writeFile(file, svg, "utf8");
    } else {
      const png = sharp(Buffer.from(svg));
      if (target.opaque) png.flatten({ background: BRAND_COLORS.primary });
      await png.png({ compressionLevel: 9 }).toFile(file);
    }

    console.log(
      `  ${target.path.padEnd(30)} ${target.px}px` +
        `${target.rounded ? "  rounded" : ""}` +
        `${target.safeZone ? "  safe-zone" : ""}` +
        `${target.badge ? "  badge" : ""}` +
        `${target.opaque ? "  opaque" : "  alpha"}`,
    );
  }

  console.log("\nGenerated from lib/brand/mark.ts");
}

main();
