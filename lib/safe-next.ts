/**
 * A `?next=` page to go to after logging in or signing up, only if it's a
 * page on this site ("/connect/telegram?code=…"), never another website.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next.slice(0, 500);
}

/** "/login" + "?next=…" when there's somewhere to come back to. */
export function withNext(path: string, next: string | null | undefined): string {
  const n = safeNext(next);
  return n ? `${path}?next=${encodeURIComponent(n)}` : path;
}
