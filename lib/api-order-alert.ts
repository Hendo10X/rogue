import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { apiKey, user } from "@/db/schema";
import { formatAmount } from "@/lib/currency";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";

/**
 * Telegram alert for an order placed through the public API (/api/v1), so
 * reseller orders are as visible to admins as website orders. Never throws:
 * an alert failing must not fail the order.
 */
export async function alertApiOrder(params: {
  userId: string;
  keyId: string;
  kind: "log" | "boosting";
  product: string;
  quantity: number;
  amountNgn: string | number;
  status: string;
  orderId: string;
}) {
  try {
    const [[buyer], [key]] = await Promise.all([
      db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, params.userId)).limit(1),
      db.select({ name: apiKey.name, prefix: apiKey.keyPrefix }).from(apiKey).where(eq(apiKey.id, params.keyId)).limit(1),
    ]);
    await sendTelegramMessage(
      [
        `🔌 <b>New API order</b> (${params.kind === "log" ? "Log" : "Boosting"})`,
        ``,
        `<b>Product:</b> ${escapeHtml(params.product)} × ${params.quantity}`,
        `<b>Amount:</b> ₦${escapeHtml(formatAmount(params.amountNgn))}`,
        `<b>Status:</b> ${escapeHtml(params.status)}`,
        `<b>Customer:</b> ${escapeHtml(buyer?.name ?? "?")} (${escapeHtml(buyer?.email ?? "?")})`,
        `<b>API key:</b> ${escapeHtml(key?.name ?? "?")} (${escapeHtml(key?.prefix ?? "?")}…)`,
        `<b>Order:</b> ${escapeHtml(params.orderId.slice(0, 8))}…`,
      ].join("\n"),
    );
  } catch (err) {
    console.error("[API order alert] failed", err);
  }
}
