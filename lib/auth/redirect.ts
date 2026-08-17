/**
 * Post-login return paths.
 *
 * Sign-in is reachable from anywhere — the inquiry form, a phone reveal, a
 * report dialog — and dropping the user on the home page after they verified an
 * OTP costs exactly the conversion the redirect was protecting. So the origin
 * travels in a `next` query parameter.
 *
 * Which makes it attacker-controlled input. `next` is only ever honoured when
 * it is a same-origin absolute path: a value like `//evil.example` is a
 * protocol-relative URL that browsers treat as another origin, and
 * `https://evil.example` needs no explanation.
 */

/** Control characters would let a value smuggle a header or a second URL. */
function hasControlChars(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (value.length > 512) return undefined;

  // Must be a path, not a URL, and not protocol-relative.
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  // Browsers normalise backslashes to forward slashes, so `/\evil.example`
  // reaches the network as `//evil.example`.
  if (value.includes("\\")) return undefined;
  if (hasControlChars(value)) return undefined;

  return value;
}

/**
 * Builds the sign-in URL that returns here afterwards. Takes a resolved,
 * locale-prefixed path — the same thing `pathFor()` produces.
 */
export function loginPathWithNext(loginPath: string, next?: string) {
  const target = safeNext(next);
  return target ? `${loginPath}?next=${encodeURIComponent(target)}` : loginPath;
}
