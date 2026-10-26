/**
 * Turns an error from the server, a supplier or the browser into a sentence a
 * customer understands. Our own API messages are already written for people
 * and pass through unchanged; anything technical becomes a plain explanation.
 */

const RULES: [RegExp, string][] = [
  // Connection problems on the customer's side or ours.
  [/failed to fetch|networkerror|network request failed|load failed|unreachable|econn|etimedout|timed? ?out/i,
    "We couldn't connect. Check your internet and try again."],
  // Wallet too low (our purchase routes say "Insufficient balance (₦… < ₦…)").
  [/insufficient (wallet )?balance.*(₦|fund your wallet)|not enough (money|balance) in your wallet/i,
    "You don't have enough money in your wallet for this. Add funds and try again."],
  // Login and session.
  [/invalid email or password|invalid_email_or_password|invalid credentials/i, "That email or password is wrong. Please try again."],
  [/user already exists|email already (in use|exists|registered)|user_already_exists/i, "An account with this email already exists. Try logging in instead."],
  [/password (is )?too short|password_too_short/i, "Your password needs at least 8 characters."],
  [/invalid password|incorrect password|invalid_password/i, "Your current password is wrong."],
  [/email not verified|email_not_verified/i, "Please confirm your email first. Check your inbox for the link."],
  [/^unauthorized$|unauthenticated|session (has )?expired|no session/i, "You've been logged out. Please log in again."],
  [/too many requests|rate limit/i, "You're going a bit fast. Wait a moment and try again."],
  // Suppliers and server faults: never show their raw text. (No bare status
  // codes here: "₦500" in a price must not match.)
  [/supplier|http \d{3}|status code|internal server error|bad gateway|service unavailable|api error|exception|stack trace|\bundefined\b|\bnull\b|\{|\}/i,
    "Something went wrong on our side. Please try again in a few minutes."],
];

export function plainError(raw: unknown, fallback = "Something went wrong. Please try again."): string {
  const message = (raw instanceof Error ? raw.message : typeof raw === "string" ? raw : "").trim();
  if (!message) return fallback;
  for (const [pattern, plain] of RULES) if (pattern.test(message)) return plain;
  return message;
}
