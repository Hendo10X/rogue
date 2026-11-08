import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { boostingOrder, otpOrder, proxyOrder } from "@/db/schema";
import { boostingProgress, customerBoostingStatus, refreshBoostingOrder } from "@/lib/boosting/refresh";
import { appLabel } from "@/lib/otp/labels";
import { countryLabel } from "@/lib/otp/catalog";
import { asType, PROXY_TYPE_LABEL } from "@/lib/proxies/orders";
import { esc } from "./api";
import { getRecentOrders } from "./catalog";
import { LOG_STATUS } from "./logs";
import { MENU_BUTTON, MENU_ROW, naira, type Ctx, type Out } from "./ui";
import type { BotAccount } from "./accounts";

/** "My orders" across logs, boosting, OTP numbers and proxies, newest first. */

type Row = { at: Date; text: string; cb: string };

const icon = (s: string) =>
  ({ completed: "✅", received: "✅", active: "✅", failed: "❌", cancelled: "↩️", refunded: "↩️", partial: "◐" })[s] ?? "⏳";

export async function showOrders(out: Out, account: BotAccount) {
  const [logs, boosts, otps, proxies] = await Promise.all([
    getRecentOrders(account.userId),
    db.select().from(boostingOrder).where(eq(boostingOrder.userId, account.userId)).orderBy(desc(boostingOrder.createdAt)).limit(8),
    db.select().from(otpOrder).where(eq(otpOrder.userId, account.userId)).orderBy(desc(otpOrder.createdAt)).limit(8).catch(() => []),
    db.select().from(proxyOrder).where(eq(proxyOrder.userId, account.userId)).orderBy(desc(proxyOrder.createdAt)).limit(8).catch(() => []),
  ]);
  const rows: Row[] = [
    ...logs.map((o: (typeof logs)[number]) => ({ at: o.createdAt, text: `${icon(o.status)} 🛒 ${o.title.slice(0, 28)} · ${naira(o.amount)}`, cb: `o:${o.id}` })),
    ...boosts.map((o: (typeof boosts)[number]) => ({
      at: o.createdAt,
      text: `${icon(customerBoostingStatus(o))} 🚀 ${o.serviceName.slice(0, 28)} · ${naira(o.amount)}`,
      cb: `bd:${o.id}`,
    })),
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
  if (!rows.length) return out("You haven't bought anything yet.", [[{ text: "🛍 Shop", callback_data: "m" }]]);
  return out("📦 <b>Your latest orders</b>\nTap one for details.", [...rows.map((r) => [{ text: r.text.slice(0, 60), callback_data: r.cb }]), MENU_ROW]);
}

/** A boosting order's status and progress. */
export async function showBoostOrder(ctx: Ctx, id: string) {
  let [o] = await db
    .select()
    .from(boostingOrder)
    .where(and(eq(boostingOrder.id, id), eq(boostingOrder.userId, ctx.account.userId)))
    .limit(1);
  if (!o) return ctx.out("Order not found.", MENU_BUTTON);
  // Same refresh as the website's orders page: progress, and refunds when the supplier cancels.
  if (["pending", "processing"].includes(o.status) && o.externalOrderId != null) o = await refreshBoostingOrder(o).catch(() => o);
  const status = customerBoostingStatus(o);
  const progress = boostingProgress(o);
  const label: Record<string, string> = {
    completed: "✅ Completed",
    processing: `⏳ In progress · ${progress}% delivered`,
    pending: "⏳ Starting soon",
    partial: "◐ Partly delivered · the rest was refunded",
    failed: "❌ Failed · refunded",
    refunded: "↩️ Refunded",
  };
  return ctx.out(
    `🚀 <b>${esc(o.serviceName)}</b>\n🔗 ${esc(o.link)}\n🔢 ${o.quantity.toLocaleString()} · ${naira(o.amount)}\n\n${label[status] ?? esc(status)}`,
    [[{ text: "🔄 Refresh", callback_data: `bd:${id}` }], [{ text: "📦 My orders", callback_data: "ord" }], MENU_ROW],
  );
}

export { LOG_STATUS };
