import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { fetchServices, type BoostingService } from "@/lib/boosting/provider";
import { getHiddenServiceIds } from "@/lib/boosting/hidden";
import { getBoostingPricer } from "@/lib/boosting/profit";
import { placeBoostingOrder, quoteBoosting } from "@/lib/boosting/place-order";
import { esc, send } from "./api";
import { claimPurchase, setPending, type Pending } from "./accounts";
import { balanceOf, MENU_BUTTON, MENU_ROW, naira, PAGE, pager, shortOf, type Ctx, type Out } from "./ui";

/** Boosting (followers, likes, views…): category → service → link → quantity → confirm. */

type Priced = BoostingService & { sell: number };

/** Services customers can buy, priced per 1,000, cheapest first (same rules as the website). */
async function visibleServices(): Promise<Priced[]> {
  const [services, hidden, pricer] = await Promise.all([fetchServices().catch(() => []), getHiddenServiceIds(), getBoostingPricer()]);
  return services
    .filter((s) => !hidden.has(s.service))
    .map((s) => ({ ...s, sell: pricer.sellRate(s.service, s.rate) }))
    .sort((a, b) => a.sell - b.sell || a.name.localeCompare(b.name));
}

async function categories(): Promise<string[]> {
  return [...new Set((await visibleServices()).map((s) => s.category))].sort((a, b) => a.localeCompare(b));
}

const BOOST_ROW = [{ text: "🚀 All boosting", callback_data: "bs:0" }];

export async function showBoostCategories(out: Out, page: number) {
  const cats = await categories();
  if (!cats.length) return out("Boosting isn't available right now. Please check back soon.", MENU_BUTTON);
  const slice = cats.slice(page * 10, page * 10 + 10);
  return out("🚀 <b>Boosting</b>\nPick a category, or tap 🔎 to search (e.g. <b>instagram followers</b>):", [
    ...slice.map((c, i) => [{ text: c.slice(0, 50), callback_data: `bc:${page * 10 + i}:0` }]),
    ...pager(page, cats.length > (page + 1) * 10, (p) => `bs:${p}`),
    [{ text: "🔎 Search services", callback_data: "bss" }],
    MENU_ROW,
  ]);
}

function serviceRows(list: Priced[]) {
  return list.map((s) => [{ text: `${s.name.slice(0, 44)} · ${naira(s.sell)}/1k`, callback_data: `bv:${s.service}` }]);
}

export async function showBoostServices(out: Out, catIndex: number, page: number) {
  const cats = await categories();
  const cat = cats[catIndex];
  if (!cat) return showBoostCategories(out, 0);
  const list = (await visibleServices()).filter((s) => s.category === cat);
  return out(`🚀 <b>${esc(cat)}</b>\nPrices are per 1,000. Tap a service:`, [
    ...serviceRows(list.slice(page * PAGE, page * PAGE + PAGE)),
    ...pager(page, list.length > (page + 1) * PAGE, (p) => `bc:${catIndex}:${p}`),
    BOOST_ROW,
    MENU_ROW,
  ]);
}

export async function searchBoostServices(out: Out, term: string, page = 0) {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  const list = (await visibleServices()).filter((s) => {
    const hay = `${s.name} ${s.category}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  if (!list.length) return out(`🔎 No boosting service matches “${esc(term)}”. Try fewer words.`, [BOOST_ROW, MENU_ROW]);
  const enc = encodeURIComponent(term).slice(0, 40);
  return out(`🔎 Boosting for “${esc(term)}”, cheapest first (per 1,000):`, [
    ...serviceRows(list.slice(page * PAGE, page * PAGE + PAGE)),
    ...pager(page, list.length > (page + 1) * PAGE, (p) => `bsr:${p}:${enc}`),
    BOOST_ROW,
    MENU_ROW,
  ]);
}

export async function showBoostService(out: Out, serviceId: number) {
  const q = await quoteBoosting(serviceId, 1000);
  if (!q) return out("This service isn't available any more.", [BOOST_ROW, MENU_ROW]);
  const { service, min, max, rateNgnPer1000 } = q;
  return out(
    `<b>${esc(service.name)}</b>\n${esc(service.category)}\n\n💵 <b>${naira(rateNgnPer1000)}</b> per 1,000\n📏 Order between ${min.toLocaleString()} and ${max.toLocaleString()}`,
    [[{ text: "🚀 Order this", callback_data: `bo:${serviceId}` }], BOOST_ROW, MENU_ROW],
  );
}

/** Step 1 of ordering: ask for the link. */
export async function askBoostLink(ctx: Ctx, serviceId: number) {
  const q = await quoteBoosting(serviceId, 1000);
  if (!q) return ctx.out("This service isn't available any more.", [BOOST_ROW, MENU_ROW]);
  await setPending(ctx.account.telegramId, { kind: "boost_link", serviceId });
  return ctx.out(
    `<b>${esc(q.service.name)}</b>\n\n🔗 Send the link to boost (the profile, post or video URL). Make sure the account is public.`,
    [[{ text: "⬅️ Back", callback_data: `bv:${serviceId}` }], MENU_ROW],
  );
}

/** Step 2: the customer typed a link; ask how many. */
export async function gotBoostLink(ctx: Ctx, serviceId: number, text: string) {
  const link = text.trim();
  if (link.length < 3 || link.length > 500 || /\s/.test(link)) {
    return ctx.out("That doesn't look like a link. Send the full URL, e.g. <b>https://instagram.com/yourname</b>.", [MENU_ROW]);
  }
  const q = await quoteBoosting(serviceId, 1000);
  if (!q) return ctx.out("This service isn't available any more.", [BOOST_ROW, MENU_ROW]);
  await setPending(ctx.account.telegramId, { kind: "boost_qty", serviceId, link });
  const quick = [...new Set([q.min, 500, 1000, 5000, 10000])].filter((n) => n >= q.min && n <= q.max).slice(0, 4);
  return ctx.out(
    `How many? Type a number between <b>${q.min.toLocaleString()}</b> and <b>${q.max.toLocaleString()}</b>, or tap one:`,
    [quick.map((n) => ({ text: n.toLocaleString(), callback_data: `bq:${n}` })), MENU_ROW],
  );
}

/** Step 3: quantity chosen; show the total and ask to confirm. */
export async function confirmBoost(ctx: Ctx, pending: Pending, qtyInput: number) {
  if (pending?.kind !== "boost_qty" && pending?.kind !== "boost_ready") return showBoostCategories(ctx.out, 0);
  const { serviceId, link } = pending;
  const q = await quoteBoosting(serviceId, qtyInput);
  if (!q) return ctx.out("This service isn't available any more.", [BOOST_ROW, MENU_ROW]);
  if (!Number.isFinite(qtyInput) || qtyInput < q.min || qtyInput > q.max) {
    return ctx.out(`Please send a number between ${q.min.toLocaleString()} and ${q.max.toLocaleString()}.`, [MENU_ROW]);
  }
  const bal = await balanceOf(ctx.account);
  if (bal + 0.01 < q.totalNgn) return shortOf(ctx, `${q.qty.toLocaleString()} × ${esc(q.service.name)}`, q.totalNgn, bal, `bv:${serviceId}`);
  await setPending(ctx.account.telegramId, { kind: "boost_ready", serviceId, link, qty: q.qty });
  return ctx.out(
    `<b>${esc(q.service.name)}</b>\n🔗 ${esc(link)}\n🔢 ${q.qty.toLocaleString()}\n💵 <b>${naira(q.totalNgn)}</b>\n\nBalance after: ${naira(bal - q.totalNgn)}`,
    [[{ text: `✅ Confirm · ${naira(q.totalNgn)}`, callback_data: "bx" }], [{ text: "⬅️ Back", callback_data: `bv:${serviceId}` }]],
  );
}

/** Step 4: place it (same code as the website's boosting order). */
export async function placeBoost(ctx: Ctx, pending: Pending) {
  const { account, chatId, out } = ctx;
  if (pending?.kind !== "boost_ready") return out("That order expired. Please pick the service again.", [BOOST_ROW, MENU_ROW]);
  if (await isUserSuspended(account.userId)) return out(SUSPENDED_MESSAGE, MENU_BUTTON);
  if (!(await claimPurchase(account.telegramId))) return; // already placing
  await out("⏳ Placing your order…");
  const r = await placeBoostingOrder(account.userId, { serviceId: pending.serviceId, link: pending.link, quantity: pending.qty }).finally(() =>
    setPending(account.telegramId, null),
  );
  if (!r.ok) {
    return send(chatId, `❌ ${esc(friendlyBoostError(r.error))}`, [BOOST_ROW, MENU_ROW]);
  }
  return send(chatId, `✅ <b>Order placed</b> · ${naira(r.data.amount)}\n\nIt usually starts within minutes. Check progress under 📦 My orders.`, [
    [{ text: "📦 My orders", callback_data: "ord" }],
    BOOST_ROW,
    MENU_ROW,
  ]);
}

function friendlyBoostError(raw: string): string {
  const msg = raw.replace(/\.\s*$/, "");
  // Messages that already say what happened to the money stay as they are.
  if (/insufficient balance|wallet|charged/i.test(msg)) return raw;
  if (/link|url|username|private/i.test(msg)) return `The supplier didn't accept that link (${msg}). Check it's public and correct. You haven't been charged.`;
  return `${msg}. You haven't been charged.`;
}
