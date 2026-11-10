import { extractSecret, secondsLeft, totp } from "@/lib/totp";
import { esc } from "./api";
import { setPending } from "./accounts";
import { fits, MENU_ROW, type Ctx, type Out } from "./ui";

/**
 * 2FA codes, like Tools → 2FA codes on the website: send the 2FA secret from a
 * log (or an otpauth:// link) and get the current 6-digit login code. The
 * secret is only used to work out the code; nothing is saved.
 */

export async function askTotp(ctx: Ctx) {
  await setPending(ctx.account.telegramId, { kind: "totp" });
  return ctx.out(
    "🔐 <b>2FA code</b>\n\nSend the 2FA secret key (the long code of letters and numbers in your log, e.g. <code>JBSWY3DPEHPK3PXP</code>) or an <code>otpauth://</code> link.",
    [MENU_ROW],
  );
}

export async function gotTotpSecret(ctx: Ctx, text: string) {
  const secret = extractSecret(text);
  if (!secret) {
    return ctx.out("That doesn't look like a 2FA secret. It's usually 16–32 letters A–Z and numbers 2–7. Try again, or tap Menu.", [MENU_ROW]);
  }
  await setPending(ctx.account.telegramId, null);
  return showTotpCode(ctx.out, secret);
}

/** The current code (and the next one when it's about to change). */
export async function showTotpCode(out: Out, secret: string) {
  const left = secondsLeft();
  const code = await totp(secret);
  const next = left <= 8 ? await totp(secret, Date.now() + 30_000) : null;
  const spaced = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;
  const refresh = `tf:${secret}`;
  return out(
    [
      `🔐 Your code: <code>${esc(spaced(code))}</code>`,
      `⏱ Valid for ${left} more second${left === 1 ? "" : "s"}${next ? ` · next: <code>${esc(spaced(next))}</code>` : ""}`,
      "",
      "Tap the code to copy it. Codes change every 30 seconds.",
    ].join("\n"),
    [
      // The secret rides in the button so "New code" works without saving it anywhere.
      ...(fits(refresh) ? [[{ text: "🔄 New code", callback_data: refresh, style: "primary" as const }]] : []),
      [{ text: "🔐 Another key", callback_data: "tk" }],
      MENU_ROW,
    ],
  );
}
