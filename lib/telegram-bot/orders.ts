import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { otpOrder, proxyOrder } from "@/db/schema";
import { appLabel } from "@/lib/otp/labels";
import { countryLabel } from "@/lib/otp/catalog";
import { asType, PROXY_TYPE_LABEL } from "@/lib/proxies/orders";
import { MENU_ROW, naira, type Out } from "./ui";
import type { MemberAccount } from "./accounts";

/** "My orders" in the bot: OTP numbers and proxies, newest first (logs and boosting stay on the website). */

const icon = (s: string) => ({ received: "✅", active: "✅", failed: "❌", cancelled: "↩️", refunded: "↩️" })[s] ?? "⏳";

export async function showOrders(out: Out, account: MemberAccount) {
  const [otps, proxies] = await Promise.all([
    db.select().from(otpOrder).where(eq(otpOrder.userId, account.userId)).orderBy(desc(otpOrder.createdAt)).limit(10).catch(() => []),
    db.select().from(proxyOrder).where(eq(proxyOrder.userId, account.userId)).orderBy(desc(proxyOrder.createdAt)).limit(10).catch(() => []),
  ]);
  const rows = [
    ...otps.map((o: (typeof otps)[number]) => ({
      at: o.createdAt,
      text: `${icon(o.status)} 📱 ${appLabel(o.app)} · ${countryLabel(o.country)} · ${naira(o.amount)}`,
      cb: `on:${o.id}`,
    })),
    ...proxies.map((o: (typeof proxies)[number]) => ({
      at: o.createdAt,
      text: `${icon(o.status)} 🌐 ${o.quantity}× ${PROXY_TYPE_LABEL[asType(o.proxyType)]} · ${o.country} · ${naira(o.amount)}`,
      cb: `po:${o.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);
  if (!rows.length) {
    return out("You haven't bought any OTP numbers or proxies yet.", [
      [{ text: "📱 OTP numbers", callback_data: "ot:0" }, { text: "🌐 Proxies", callback_data: "px" }],
      MENU_ROW,
    ]);
  }
  return out("📦 <b>Your latest orders</b>\nTap one for details.", [...rows.map((r) => [{ text: r.text.slice(0, 60), callback_data: r.cb }]), MENU_ROW]);
}
