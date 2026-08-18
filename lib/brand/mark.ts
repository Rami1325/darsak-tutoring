/**
 * The brand mark, as geometry rather than as a drawing.
 *
 * A stylised dāl (د) — the first letter of درسك — drawn as a path rather than
 * set as type, so it renders identically in every locale regardless of which
 * script's webfont happens to be loaded. It is a mark and not the wordmark on
 * purpose: درسك shrunk to 32px is four illegible strokes, and the favicon is
 * the one place the logo has to survive being tiny.
 *
 * Kept here rather than inside `BrandMark` because two consumers need the same
 * shape from different worlds: the React component, which colours it with
 * Tailwind tokens so it follows the theme, and `scripts/build-icons.ts`, which
 * rasterises it with literal colours for the manifest and the home screen. A
 * favicon that has quietly drifted from the header logo is the kind of thing
 * nobody notices for a year.
 */
export const BRAND_MARK = {
  /** Every coordinate below is in this square. */
  size: 32,
  /** Corner radius of the tile. Scales with `size`. */
  radius: 9,
  glyph: "M21 10h-6.2a5.6 5.6 0 0 0 0 11.2H16",
  strokeWidth: 2.6,
  dot: { cx: 16, cy: 25, r: 1.75 },
} as const;

/**
 * The palette resolved to hex.
 *
 * `app/globals.css` states these as `oklch()`, which is right for CSS and
 * useless to an SVG rasteriser or a `theme_color` field. These are the same
 * colours converted once: `--primary` is `oklch(0.48 0.09 178)` and
 * `--background` is `oklch(0.994 0.003 106)` — the latter round-trips to the
 * `#fdfdfb` the root layout's `themeColor` already hardcodes, which is the
 * check that the conversion is right.
 *
 * The light palette, deliberately: an installed app's icon and splash do not
 * follow the system theme, and the tile is legible on either.
 */
export const BRAND_COLORS = {
  primary: "#006e5e",
  onPrimary: "#f6fefc",
  background: "#fdfdfb",
} as const;

/**
 * A standalone SVG of the mark, with colours baked in.

/**
 * A standalone SVG of the mark, with colours baked in.
 *
 * Three variants, because three platforms crop differently:
 *
 * - **rounded** — the tile draws its own corners. Right for a browser tab and
 *   for the manifest's `purpose: "any"`, where nothing masks it.
 * - **square** — full bleed, glyph at full size. Right for iOS, which applies
 *   its own squircle; supplying rounded corners here rounds them twice.
 * - **square + safe zone** — full bleed with the glyph scaled to 60%. Right for
 *   Android's `purpose: "maskable"`, which crops to whatever shape the launcher
 *   uses and guarantees only a centred circle 80% of the width. Ship without it
 *   and Android either letterboxes the icon inside its own circle or clips the
 *   corners off the tile.
 *
 * `px` sets the width and height attributes while the viewBox stays at 32, so
 * a rasteriser renders at the target resolution instead of upscaling a 32px
 * bitmap.
 */
export function brandMarkSvg({
  px = BRAND_MARK.size,
  rounded = true,
  safeZone = false,
}: { px?: number; rounded?: boolean; safeZone?: boolean } = {}) {
  const { size, radius, glyph, strokeWidth, dot } = BRAND_MARK;
  const scale = 0.6;
  const inset = (size * (1 - scale)) / 2;

  const art =
    `<path d="${glyph}" fill="none" stroke="${BRAND_COLORS.onPrimary}"` +
    ` stroke-width="${strokeWidth}" stroke-linecap="round" />` +
    `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${BRAND_COLORS.onPrimary}" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${px}" height="${px}">
  <rect width="${size}" height="${size}" rx="${rounded ? radius : 0}" fill="${BRAND_COLORS.primary}" />
  ${safeZone ? `<g transform="translate(${inset} ${inset}) scale(${scale})">${art}</g>` : art}
</svg>
`;
}
