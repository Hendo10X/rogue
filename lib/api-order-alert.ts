import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { apiKey, user } from "@/db/schema";

/**
 * Admin Telegram alert for a successful order placed through the public API
 * (/api/v1), in the same short format as website orders, tagged
 * "API · <key name>". Never throws: an alert failing must not fail the order.
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
      db.select({ name: apiKey.name }).from(apiKey).where(eq(apiKey.id, params.keyId)).limit(1),
    ]);
    const { sendAdminOrderNotification } = await import("@/lib/email");
    await sendAdminOrderNotification({
      orderType: params.kind === "log" ? "marketplace" : "boosting",
      product: params.product,
      quantity: params.quantity,
      amount: String(params.amountNgn),
      currency: "NGN",
      userName: buyer?.name ?? "?",
      userEmail: buyer?.email ?? "?",
      via: `API · ${key?.name ?? "key"}`,
    });
  } catch (err) {
    console.error("[API order alert] failed", err);
  }
}
