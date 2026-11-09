import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { purchaseListing } from "@/lib/marketplace-purchase";
import { bulkUnitPrice, getBulkPricing, unitPriceForQuantity } from "@/lib/bulk-pricing";
import { formatForListing, labelLog, logToText } from "@/lib/log-fields";
import { esc, send, type Keyboard } from "./api";
import { claimPurchase, setPending } from "./accounts";
import { getListing, getListings, getOrderDetails, getPlatforms } from "./catalog";
import { balanceOf, MENU_BUTTON, MENU_ROW, naira, pager, pairs, sendBlocks, shortOf, type Ctx, type Out } from "./ui";

/** Logs: browse by platform or search, buy, and get the login details in the chat. */

export const LOG_STATUS: Record<string, string> = {
  completed: "✅ Delivered",
  failed: "❌ Failed · refunded",
  pending: "⏳ Pending",
  processing: "⏳ Processing",
  manual_review: "⏳ Being delivered by our team",
};

const SHOP_ROW = [{ text: "🛒 All platforms", callback_data: "shop" }];

export async function showPlatforms(out: Out) {
  const platforms = await getPlatforms();
  if (!platforms.length) return out("No logs are in stock right now. Please check back soon.", MENU_BUTTON);
  const buttons = platforms.map((p, i) => ({ text: p.slice(0, 30), callback_data: `pl:${i}:0` }));
  return out("🛒 <b>Logs</b>\nPick a platform, or tap 🔎 to search:", [
    ...pairs(buttons).slice(0, 40),
    [{ text: "🔎 Search logs", callback_data: "srch" }],
    MENU_ROW,
  ]);
}

export async function showListings(out: Out, opts: { platform?: string; platformIndex?: number; search?: string; page: number }) {
  const [{ items, hasMore }, bulk] = await Promise.all([getListings(opts), getBulkPricing()]);
  const title = opts.search ? `🔎 Results for “${esc(opts.search)}”` : `🛒 ${esc(opts.platform ?? "")}`;
  if (!items.length) {
    return out(opts.search ? `${title}\n\nNothing in stock matches that. Try another word.` : `${title}\n\nNothing in stock here right now.`, [
      SHOP_ROW,
      MENU_ROW,
    ]);
  }
  const rows: Keyboard = items.map((l) => [{ text: `${l.title.slice(0, 40)} · ${naira(l.priceNgn)}`, callback_data: `l:${l.id}` }]);
  const page = (p: number) => (opts.search ? `sr:${p}:${encodeURIComponent(opts.search).slice(0, 40)}` : `pl:${opts.platformIndex}:${p}`);
  const bulkNote = bulk.enabled ? `\n💸 Buy ${bulk.minQty}+ of a log and pay up to ${naira(bulk.amountOff)} less each.` : "";
  return out(`${title}\nPage ${opts.page + 1}. Tap a log to see details.${bulkNote}`, [
    ...rows,
    ...pager(opts.page, hasMore, page),
    SHOP_ROW,
    MENU_ROW,
  ]);
}

export async function showListing(out: Out, id: string) {
  const [l, bulk] = await Promise.all([getListing(id), getBulkPricing()]);
  if (!l || l.stock <= 0) return out("This log just sold out.", [SHOP_ROW, MENU_ROW]);
  const desc = l.description ? `\n\n${esc(l.description.slice(0, 600))}` : "";
  // Null when the discount would take this log to its cost: it then keeps its normal price.
  const bulkPrice = bulkUnitPrice(l.priceNgn, l.costNgn, bulk);
  const hasBulk = bulkPrice !== null && l.stock >= bulk.minQty;
  const bulkLine = hasBulk ? `\n💸 <b>${naira(bulkPrice)}</b> each when you buy ${bulk.minQty}+` : "";
  const qtys = [...new Set([1, 2, 5, 10, ...(hasBulk ? [bulk.minQty] : [])])].filter((q) => q <= l.stock).sort((a, b) => a - b);
  return out(
    `<b>${esc(l.title)}</b>\n${esc(l.platform)} · ${l.stock.toLocaleString()} in stock\n💵 <b>${naira(l.priceNgn)}</b> each${bulkLine}${desc}\n\nHow many?`,
    [
      ...pairs(qtys.map((q) => ({ text: hasBulk && q >= bulk.minQty ? `Buy ${q} 💸` : `Buy ${q}`, callback_data: `q:${l.id}:${q}` }))),
      SHOP_ROW,
      MENU_ROW,
    ],
  );
}

export async function confirmBuy(ctx: Ctx, id: string, qty: number) {
  const [l, bal, bulk] = await Promise.all([getListing(id), balanceOf(ctx.account), getBulkPricing()]);
  if (!l || l.stock < qty) return ctx.out("Not enough in stock any more.", [SHOP_ROW, MENU_ROW]);
  // Same rule as checkout: the bulk price for every piece once the quantity qualifies.
  const unit = unitPriceForQuantity(l.priceNgn, l.costNgn, qty, bulk);
  const total = unit * qty;
  if (bal + 0.01 < total) return shortOf(ctx, `${qty} × <b>${esc(l.title)}</b>`, total, bal, `l:${l.id}`);
  const saving = unit < l.priceNgn ? `\n💸 Bulk price applied: ${naira(unit)} each (${naira(l.priceNgn - unit)} off)` : "";
  return ctx.out(`Buy ${qty} × <b>${esc(l.title)}</b> for <b>${naira(total)}</b>?${saving}\n\nBalance after: ${naira(bal - total)}`, [
    [{ text: `✅ Confirm · ${naira(total)}`, callback_data: `b:${l.id}:${qty}` }],
    [{ text: "⬅️ Back", callback_data: `l:${l.id}` }],
  ]);
}

export async function buyLog(ctx: Ctx, id: string, qty: number) {
  const { account, chatId, out } = ctx;
  if (await isUserSuspended(account.userId)) return out(SUSPENDED_MESSAGE, MENU_BUTTON);
  const l = await getListing(id);
  if (!l) return out("This log isn't available any more.", MENU_BUTTON);
  if (!(await claimPurchase(account.telegramId))) return; // already buying
  await out(`⏳ Buying ${qty} × <b>${esc(l.title)}</b>…`);
  const res = await purchaseListing(account.userId, { listingSlug: l.slug, quantity: qty }).finally(() => setPending(account.telegramId, null));
  const data = (await res.json().catch(() => ({}))) as { orderId?: string; error?: string };
  if (!res.ok || !data.orderId) {
    return send(chatId, `❌ ${esc(data.error ?? "The purchase didn't go through. You haven't been charged.")}`, [SHOP_ROW, MENU_ROW]);
  }
  return showLogOrder({ ...ctx, out: (t, kb) => send(chatId, t, kb) }, data.orderId);
}

/** Order status, and the login details as labelled fields once delivered. */
export async function showLogOrder(ctx: Ctx, orderId: string) {
  const { account, chatId, out } = ctx;
  const o = await getOrderDetails(account.userId, orderId);
  if (!o) return out("Order not found.", MENU_BUTTON);
  const head = `<b>${esc(o.title)}</b> × ${o.quantity}\n${LOG_STATUS[o.status] ?? esc(o.status)}`;
  const lines = o.status === "completed" && o.notes ? o.notes.split("\n").map((s: string) => s.trim()).filter(Boolean) : [];
  if (!lines.length) {
    const extra =
      o.status === "failed" ? "\n\nYour money is back in your wallet." : o.status === "completed" ? "" : "\n\nWe'll message you here when it's ready.";
    return out(head + extra, [[{ text: "📦 My orders", callback_data: "ord" }], MENU_ROW]);
  }
  const format = formatForListing(o.metadata as Record<string, unknown> | null, o.description);
  const pretty = lines
    .map((line: string, i: number) => {
      const fields = labelLog(line, format);
      const body = fields ? logToText(fields) : line;
      return lines.length > 1 ? `Log ${i + 1}\n${body}` : body;
    })
    .join("\n\n");
  await out(`${head}\n\nYour login details:`);
  await sendBlocks((t) => send(chatId, t), pretty, esc);
  return send(chatId, "Keep these safe. They're also saved under 📦 My orders.", [
    [{ text: "📋 Raw format", callback_data: `or:${orderId}` }],
    [{ text: "🛒 Shop more", callback_data: "shop" }],
    MENU_ROW,
  ]);
}

/** The delivered logs exactly as received (one line each), for tools that need that format. */
export async function showLogOrderRaw(ctx: Ctx, orderId: string) {
  const o = await getOrderDetails(ctx.account.userId, orderId);
  if (!o?.notes || o.status !== "completed") return ctx.out("Order not found.", MENU_BUTTON);
  await sendBlocks((t) => send(ctx.chatId, t), o.notes.trim(), esc);
  return send(ctx.chatId, "That's the original one-line format.", [MENU_ROW]);
}
