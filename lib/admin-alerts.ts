import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { formatAmount } from "@/lib/currency";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";

/** Admin Telegram alerts that aren't orders (orders: lib/order-alert.ts, lib/email.ts): deposits, sign-ups, log requests. */

export type DepositProvider = "Flutterwave" | "Korapay";

/** One short line, e.g. "💰 ₦5,000 deposit · Flutterwave · Ada · ada@example.com". */
export function adminDepositText(p: { amountNgn: number | string; provider: DepositProvider; userName: string; userEmail: string }): string {
  return `💰 <b>₦${escapeHtml(formatAmount(p.amountNgn))}</b> deposit · ${p.provider} · ${escapeHtml(p.userName)} · ${escapeHtml(p.userEmail)}`;
}

/**
 * Admin Telegram alert for a completed wallet top-up. Called only by the code
 * that just credited the wallet (the claim makes that happen once), so failed
 * or abandoned payments never alert. Never throws.
 */
export async function alertAdminOfDeposit(args: { userId: string; amountNgn: number | string; provider: DepositProvider }): Promise<void> {
  try {
    const [usr] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, args.userId)).limit(1);
    await sendTelegramMessage(
      adminDepositText({ amountNgn: args.amountNgn, provider: args.provider, userName: usr?.name ?? "Customer", userEmail: usr?.email ?? "unknown" }),
    );
  } catch (err) {
    console.error("[DepositAlert] failed", args.provider, err);
  }
}

/** "👤 New sign-up · Ada · ada@example.com · +234…" (phone only when given). */
export function adminSignupText(p: { name: string; email: string; phone?: string | null }): string {
  return `👤 New sign-up · ${[p.name, p.email, p.phone].filter((x) => x && x.trim()).map((x) => escapeHtml(String(x).trim())).join(" · ")}`;
}

/** Two lines: what they want, then who and what they said (cut short). */
export function adminLogRequestText(p: { platform: string; quantity: number; budgetNgn?: number | null; details: string; email: string }): string {
  const budget = p.budgetNgn ? ` · up to ₦${formatAmount(p.budgetNgn)}` : "";
  const details = p.details.trim().replace(/\s+/g, " ");
  return [
    `📝 <b>Log request</b> · ${escapeHtml(p.platform)} × ${p.quantity.toLocaleString("en-NG")}${escapeHtml(budget)}`,
    `${escapeHtml(p.email)} · ${escapeHtml(details.length > 120 ? `${details.slice(0, 117)}…` : details)}`,
  ].join("\n");
}

/** Sends a ready-made admin line; never throws (an alert must never break sign-up or a request). */
export async function sendAdminAlert(text: string): Promise<void> {
  try {
    await sendTelegramMessage(text);
  } catch (err) {
    console.error("[AdminAlert] failed", err);
  }
}
