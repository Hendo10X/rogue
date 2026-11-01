import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { formatAmount } from "@/lib/currency";
import { getWalletBalance } from "@/lib/wallet";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { purchaseListing } from "@/lib/marketplace-purchase";
import { answer, edit, esc, send, type Keyboard } from "./api";
import { claimPurchase, getOrCreateAccount, setPending, type BotAccount, type Pending, type TgUser } from "./accounts";
import { getListing, getListings, getOrderDetails, getPlatforms, getRecentOrders } from "./catalog";
import { createFundingLink, MAX_FUND, MIN_FUND } from "./funding";

type Message = { message_id: number; chat: { id: number; type: string }; from?: TgUser; text?: string };
type Callback = { id: string; from: TgUser; data?: string; message?: Message };
export type Update = { message?: Message; callback_query?: Callback };

/** Where a reply goes: edit the pressed message, or send a new one. */
type Out = (text: string, keyboard?: Keyboard) => Promise<unknown>;

const naira = (n: number | string) => `₦${formatAmount(n)}`;
const MENU_BUTTON: Keyboard = [[{ text: "🏠 Menu", callback_data: "m" }]];
const FUND_AMOUNTS = [2000, 5000, 10000, 20000, 50000];
const STATUS: Record<string, string> = {
  completed: "✅ Delivered",
  failed: "❌ Failed · refunded",
  pending: "⏳ Pending",
  processing: "⏳ Processing",
  manual_review: "⏳ Being delivered by our team",
};

export async function handleUpdate(update: Update): Promise<unknown> {
  if (update.callback_query) return onCallback(update.callback_query);
  const msg = update.message;
  // Private chats only: login details must never land in a group.
  if (!msg?.from || msg.chat.type !== "private") return;
  const { account, isNew } = await getOrCreateAccount(msg.from, msg.chat.id);
  const out: Out = (text, kb) => send(msg.chat.id, text, kb);
  const text = (msg.text ?? "").trim();

  if (text.startsWith("/start") || text === "/menu") {
    await setPending(account.telegramId, null);
    return showMenu(out, account, isNew ? msg.from.first_name : undefined);
  }
  if (text === "/balance") return showBalance(out, account);
  if (text === "/orders") return showOrders(out, account);
  if (text === "/fund") return showFund(out);
  if (text === "/help") return showHelp(out);

  const pending = account.pending as Pending;
  if (pending?.kind === "fund_amount") {
    const amount = Math.round(Number(text.replace(/[₦,\s]/g, "")));
    if (!Number.isFinite(amount) || amount < MIN_FUND || amount > MAX_FUND) {
      return out(`Please send an amount between ${naira(MIN_FUND)} and ${naira(MAX_FUND)}, e.g. <b>7500</b>.`, MENU_BUTTON);
    }
    await setPending(account.telegramId, null);
    return startFunding(out, account, amount);
  }
  // Anything else typed is treated as a search.
  if (text && !text.startsWith("/")) {
    await setPending(account.telegramId, null);
    return showListings(out, { search: text.slice(0, 60), page: 0 });
  }
  return showMenu(out, account);
}

async function onCallback(cb: Callback): Promise<unknown> {
  const msg = cb.message;
  if (!msg || msg.chat.type !== "private") return void answer(cb.id);
  const { account } = await getOrCreateAccount(cb.from, msg.chat.id);
  const out: Out = (text, kb) => edit(msg.chat.id, msg.message_id, text, kb);
  const [cmd, a, b] = (cb.data ?? "").split(":");
  void answer(cb.id);

  switch (cmd) {
    case "m":
      await setPending(account.telegramId, null);
      return showMenu(out, account);
    case "shop":
      return showPlatforms(out);
    case "pl": {
      const platforms = await getPlatforms();
      const platform = platforms[Number(a)];
      if (!platform) return showPlatforms(out);
      return showListings(out, { platform, platformIndex: Number(a), page: Number(b) || 0 });
    }
    case "sr":
      // Search results paging: the term rides along in the button.
      return showListings(out, { search: safeDecode(b ?? ""), page: Number(a) || 0 });
    case "srch":
      await setPending(account.telegramId, { kind: "search" });
      return out("🔎 Type what you're looking for, e.g. <b>instagram</b> or <b>facebook aged</b>.", MENU_BUTTON);
    case "l":
      return showListing(out, a);
    case "q":
      return confirmBuy(out, account, a, Number(b) || 1);
    case "b":
      return buy(msg.chat.id, out, account, a, Number(b) || 1);
    case "bal":
      return showBalance(out, account);
    case "fund":
      return showFund(out);
    case "f":
      return startFunding(out, account, Number(a));
    case "fo":
      await setPending(account.telegramId, { kind: "fund_amount" });
      return out(`Type the amount you want to add, between ${naira(MIN_FUND)} and ${naira(MAX_FUND)}.`, MENU_BUTTON);
    case "ord":
      return showOrders(out, account);
    case "o":
      return showOrder(msg.chat.id, out, account, a);
    case "help":
      return showHelp(out);
    default:
      return showMenu(out, account);
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return decodeURIComponent(s.replace(/%[0-9a-f]?$/i, ""));
  }
}

async function balanceOf(account: BotAccount): Promise<number> {
  const w = await getWalletBalance(account.userId, "NGN").catch(() => null);
  return Number((w as { balance?: string } | null)?.balance ?? 0) || 0;
}

async function showMenu(out: Out, account: BotAccount, welcomeName?: string) {
  const bal = await balanceOf(account);
  const hello = welcomeName
    ? `👋 Welcome to <b>Rogue Socials</b>, ${esc(welcomeName)}! Your wallet is ready.\n\n`
    : "";
  return out(`${hello}👛 Balance: <b>${naira(bal)}</b>\n\nWhat would you like to do?`, [
    [{ text: "🛒 Shop logs", callback_data: "shop" }, { text: "🔎 Search", callback_data: "srch" }],
    [{ text: "💰 Fund wallet", callback_data: "fund" }, { text: "📦 My orders", callback_data: "ord" }],
    [{ text: "❓ Help", callback_data: "help" }],
  ]);
}

async function showBalance(out: Out, account: BotAccount) {
  const bal = await balanceOf(account);
  return out(`👛 Your balance is <b>${naira(bal)}</b>.`, [
    [{ text: "💰 Fund wallet", callback_data: "fund" }],
    ...MENU_BUTTON,
  ]);
}

async function showPlatforms(out: Out) {
  const platforms = await getPlatforms();
  if (!platforms.length) return out("Nothing is in stock right now. Please check back soon.", MENU_BUTTON);
  const rows: Keyboard = [];
  for (let i = 0; i < platforms.length; i += 2) {
    rows.push(
      platforms.slice(i, i + 2).map((p, j) => ({ text: p.slice(0, 30), callback_data: `pl:${i + j}:0` })),
    );
  }
  return out("🛒 Pick a platform:", [...rows.slice(0, 40), ...MENU_BUTTON]);
}

async function showListings(out: Out, opts: { platform?: string; platformIndex?: number; search?: string; page: number }) {
  const { items, hasMore } = await getListings(opts);
  const title = opts.search ? `🔎 Results for “${esc(opts.search)}”` : `🛒 ${esc(opts.platform ?? "")}`;
  if (!items.length) {
    return out(opts.search ? `${title}\n\nNothing in stock matches that. Try another word.` : `${title}\n\nNothing in stock here right now.`, [
      [{ text: "🛒 All platforms", callback_data: "shop" }],
      ...MENU_BUTTON,
    ]);
  }
  const rows: Keyboard = items.map((l) => [
    { text: `${l.title.slice(0, 40)} · ${naira(l.priceNgn)}`, callback_data: `l:${l.id}` },
  ]);
  const page = (p: number) =>
    opts.search ? `sr:${p}:${encodeURIComponent(opts.search).slice(0, 40)}` : `pl:${opts.platformIndex}:${p}`;
  const nav = [
    ...(opts.page > 0 ? [{ text: "⬅️ Back", callback_data: page(opts.page - 1) }] : []),
    ...(hasMore ? [{ text: "More ➡️", callback_data: page(opts.page + 1) }] : []),
  ];
  return out(`${title}\nPage ${opts.page + 1}. Tap a log to see details.`, [
    ...rows,
    ...(nav.length ? [nav] : []),
    [{ text: "🛒 All platforms", callback_data: "shop" }],
    ...MENU_BUTTON,
  ]);
}

async function showListing(out: Out, id: string) {
  const l = await getListing(id);
  if (!l || l.stock <= 0) return out("This log just sold out.", [[{ text: "🛒 Shop", callback_data: "shop" }], ...MENU_BUTTON]);
  const desc = l.description ? `\n\n${esc(l.description.slice(0, 600))}` : "";
  const qtys = [1, 2, 5, 10].filter((q) => q <= l.stock);
  return out(
    `<b>${esc(l.title)}</b>\n${esc(l.platform)} · ${l.stock.toLocaleString()} in stock\n💵 <b>${naira(l.priceNgn)}</b> each${desc}\n\nHow many?`,
    [qtys.map((q) => ({ text: `Buy ${q}`, callback_data: `q:${l.id}:${q}` })), [{ text: "🛒 Back to shop", callback_data: "shop" }], ...MENU_BUTTON],
  );
}

async function confirmBuy(out: Out, account: BotAccount, id: string, qty: number) {
  const [l, bal] = await Promise.all([getListing(id), balanceOf(account)]);
  if (!l || l.stock < qty) return out("Not enough in stock any more.", [[{ text: "🛒 Shop", callback_data: "shop" }], ...MENU_BUTTON]);
  const total = l.priceNgn * qty;
  if (bal + 0.01 < total) {
    return out(
      `${qty} × <b>${esc(l.title)}</b> costs <b>${naira(total)}</b>, but your balance is ${naira(bal)}.\n\nAdd <b>${naira(Math.ceil(total - bal))}</b> or more to buy it.`,
      [[{ text: "💰 Fund wallet", callback_data: "fund" }], [{ text: "⬅️ Back", callback_data: `l:${l.id}` }], ...MENU_BUTTON],
    );
  }
  return out(`Buy ${qty} × <b>${esc(l.title)}</b> for <b>${naira(total)}</b>?\n\nBalance after: ${naira(bal - total)}`, [
    [{ text: `✅ Confirm · ${naira(total)}`, callback_data: `b:${l.id}:${qty}` }],
    [{ text: "⬅️ Back", callback_data: `l:${l.id}` }],
  ]);
}

async function buy(chatId: number, out: Out, account: BotAccount, id: string, qty: number) {
  if (await isUserSuspended(account.userId)) return out(SUSPENDED_MESSAGE, MENU_BUTTON);
  const l = await getListing(id);
  if (!l) return out("This log isn't available any more.", MENU_BUTTON);
  if (!(await claimPurchase(account.telegramId))) return; // already buying
  await out(`⏳ Buying ${qty} × <b>${esc(l.title)}</b>…`);
  const res = await purchaseListing(account.userId, { listingSlug: l.slug, quantity: qty }).finally(() =>
    setPending(account.telegramId, null),
  );
  const data = (await res.json().catch(() => ({}))) as { orderId?: string; status?: string; error?: string };
  if (!res.ok || !data.orderId) {
    return send(chatId, `❌ ${esc(data.error ?? "The purchase didn't go through. You haven't been charged.")}`, [
      [{ text: "🛒 Shop", callback_data: "shop" }],
      ...MENU_BUTTON,
    ]);
  }
  return showOrder(chatId, (t, kb) => send(chatId, t, kb), account, data.orderId);
}

async function showOrders(out: Out, account: BotAccount) {
  const orders = await getRecentOrders(account.userId);
  if (!orders.length) return out("You haven't bought anything yet.", [[{ text: "🛒 Shop logs", callback_data: "shop" }], ...MENU_BUTTON]);
  return out("📦 Your latest orders. Tap one to see the login details.", [
    ...orders.map((o: (typeof orders)[number]) => [
      { text: `${(STATUS[o.status] ?? o.status).split(" ")[0]} ${o.title.slice(0, 32)} · ${naira(o.amount)}`, callback_data: `o:${o.id}` },
    ]),
    ...MENU_BUTTON,
  ]);
}

/** Order status, and the login details once delivered (split if long). */
async function showOrder(chatId: number, out: Out, account: BotAccount, orderId: string) {
  const o = await getOrderDetails(account.userId, orderId);
  if (!o) return out("Order not found.", MENU_BUTTON);
  const head = `<b>${esc(o.title)}</b> × ${o.quantity}\n${STATUS[o.status] ?? esc(o.status)}`;
  const creds = o.status === "completed" && o.notes ? o.notes.trim() : "";
  if (!creds) {
    const extra = o.status === "failed" ? "\n\nYour money is back in your wallet." : o.status === "completed" ? "" : "\n\nWe'll message you here when it's ready.";
    return out(head + extra, [[{ text: "📦 My orders", callback_data: "ord" }], ...MENU_BUTTON]);
  }
  await out(`${head}\n\nYour login details:`);
  // Telegram caps a message at 4096 characters.
  for (let i = 0; i < creds.length; i += 3500) {
    await send(chatId, `<pre>${esc(creds.slice(i, i + 3500))}</pre>`);
  }
  return send(chatId, "Keep these safe. They're also saved under 📦 My orders.", [
    [{ text: "🛒 Shop more", callback_data: "shop" }],
    ...MENU_BUTTON,
  ]);
}

async function showFund(out: Out) {
  const rows: Keyboard = [];
  for (let i = 0; i < FUND_AMOUNTS.length; i += 3) {
    rows.push(FUND_AMOUNTS.slice(i, i + 3).map((n) => ({ text: naira(n), callback_data: `f:${n}` })));
  }
  return out("💰 How much do you want to add? You'll pay securely with card, transfer or USSD.", [
    ...rows,
    [{ text: "✏️ Other amount", callback_data: "fo" }],
    ...MENU_BUTTON,
  ]);
}

async function startFunding(out: Out, account: BotAccount, amount: number) {
  if (!Number.isFinite(amount) || amount < MIN_FUND || amount > MAX_FUND) return showFund(out);
  const [u] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, account.userId)).limit(1);
  try {
    const link = await createFundingLink({ userId: account.userId, email: u?.email ?? "", name: u?.name ?? "Customer", amountNgn: amount });
    return out(
      `Tap below to pay <b>${naira(amount)}</b>. Your wallet is credited automatically and I'll message you here once it's in.`,
      [[{ text: `💳 Pay ${naira(amount)}`, url: link }], ...MENU_BUTTON],
    );
  } catch {
    return out("We couldn't start the payment right now. Please try again in a minute.", MENU_BUTTON);
  }
}

function showHelp(out: Out) {
  return out(
    [
      "<b>How it works</b>",
      "1. 💰 Fund your wallet (card, transfer or USSD).",
      "2. 🛒 Pick a log and buy it from your balance.",
      "3. 🔑 The login details arrive right here, and stay under 📦 My orders.",
      "",
      "Failed orders are refunded to your wallet automatically.",
      "Tip: just type a word like <b>instagram</b> to search.",
      "",
      "Commands: /menu /fund /balance /orders",
    ].join("\n"),
    MENU_BUTTON,
  );
}

