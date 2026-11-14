import { eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { transaction, user } from "@/db/schema";
import type { Channel } from "@/lib/bot-pricing";

/**
 * Admin Telegram alert for an OTP number or proxy order, sent only once the
 * customer actually has it: the OTP code arrived (lib/otp/orders.ts) or the
 * proxies were issued (lib/proxies/orders.ts). A number still waiting for its
 * code isn't a completed order, so it isn't announced. Never throws.
 */
export async function alertAdminOfOrder(args: {
  userId: string;
  orderId: string;
  orderType: "otp" | "proxy";
  amountNgn: string;
  description: string;
  channel?: Channel;
}): Promise<void> {
  try {
    const [usr] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, args.userId)).limit(1);
    const channel = args.channel ?? (await channelOf(args.orderType, args.orderId));
    const { sendAdminOrderNotification } = await import("@/lib/email");
    await sendAdminOrderNotification({
      orderId: args.orderId,
      orderType: args.orderType,
      userEmail: usr?.email ?? "unknown",
      userName: usr?.name ?? "Customer",
      amount: args.amountNgn,
      currency: "NGN",
      serviceName: args.description,
      via: channel === "bot" ? "Telegram bot" : undefined,
    });
  } catch (err) {
    console.error("[OrderAlert] failed", args.orderType, err);
  }
}

/** Where an OTP/proxy order was bought, from its payment record (the order rows don't store it). */
async function channelOf(orderType: "otp" | "proxy", orderId: string): Promise<Channel | undefined> {
  const key = orderType === "otp" ? "otpOrderId" : "proxyOrderId";
  const [row] = await db
    .select({ channel: sql<string | null>`${transaction.metadata} ->> 'channel'` })
    .from(transaction)
    .where(sql`${transaction.metadata} ->> ${key} = ${orderId}`)
    .limit(1);
  return row?.channel === "bot" ? "bot" : undefined;
}
