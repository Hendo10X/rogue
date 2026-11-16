import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { formatAmount } from "@/lib/currency";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";

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
