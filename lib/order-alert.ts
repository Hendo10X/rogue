import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import type { Channel } from "@/lib/bot-pricing";

/**
 * "🛒 New Order Received" in the admin Telegram chat for an OTP number or
 * proxy order, like logs and boosting already send. Called from the shared
 * order code, so website and Telegram bot purchases both alert. Never throws:
 * the customer has already been charged and served.
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
    const { sendAdminOrderNotification } = await import("@/lib/email");
    await sendAdminOrderNotification({
      orderId: args.orderId,
      orderType: args.orderType,
      userEmail: usr?.email ?? "unknown",
      userName: usr?.name ?? "Customer",
      amount: args.amountNgn,
      currency: "NGN",
      serviceName: args.description,
      status: args.orderType === "otp" ? "number delivered, waiting for code" : "processing",
      via: args.channel === "bot" ? "Telegram bot" : undefined,
    });
  } catch (err) {
    console.error("[OrderAlert] failed", args.orderType, err);
  }
}
