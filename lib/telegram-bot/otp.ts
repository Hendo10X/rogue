import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { otpOrder } from "@/db/schema";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { getApps, getCountries, getOtpPricer, otpOnSale } from "@/lib/otp/settings";
import { outOfStockApps } from "@/lib/otp/stock";
import { placeOtpOrder } from "@/lib/otp/place-order";
import { cancelAndRefund, getOtpOrders, OTP_WAIT_MINUTES } from "@/lib/otp/orders";
import { appLabel } from "@/lib/otp/labels";
import { countryLabel } from "@/lib/otp/catalog";
import { esc, send, type Keyboard } from "./api";
import { claimPurchase, setPending } from "./accounts";
import { balanceOf, fits, MENU_BUTTON, MENU_ROW, naira, pager, pairs, shortOf, type Ctx, type Out } from "./ui";

/** OTP numbers: country → app → buy → wait for the code here (or cancel for a refund). */

const POPULAR_COUNTRIES = ["us", "gb", "ca", "ng", "de", "fr", "nl", "id", "in", "ph"];
const POPULAR_APPS = ["whatsapp", "telegram", "google", "facebook", "instagram", "tiktok", "twitter", "snapchat", "discord", "openai"];
const OTP_ROW = [{ text: "📱 All countries", callback_data: "ot:0" }];

async function notOnSale(out: Out) {
  if (await otpOnSale()) return false;
  await out("OTP numbers aren't available right now. Please check back soon.", MENU_BUTTON);
  return true;
}

export async function showOtpCountries(out: Out, page: number) {
  if (await notOnSale(out)) return;
  const all = await getCountries().catch(() => []);
  if (!all.length) return out("We couldn't load the countries right now. Please try again in a minute.", MENU_BUTTON);
  const popular = POPULAR_COUNTRIES.map((id) => all.find((c) => c.id === id)).filter((c): c is (typeof all)[number] => !!c);
  const rest = all.filter((c) => !POPULAR_COUNTRIES.includes(c.id));
  const per = 12;
  const list = page === 0 ? popular : rest.slice((page - 1) * per, page * per);
  const hasMore = page === 0 ? rest.length > 0 : rest.length > page * per;
  return out(page === 0 ? "📱 <b>OTP numbers</b>\nPick a country (popular first), or tap 🔎 to find one:" : `📱 Countries · page ${page + 1}`, [
    ...pairs(list.map((c) => ({ text: c.name.slice(0, 28), callback_data: `oc:${c.id}:0` }))),
    ...pager(page, hasMore, (p) => `ot:${p}`),
    [{ text: "🔎 Find a country", callback_data: "ots" }],
    MENU_ROW,
  ]);
}

export async function searchOtpCountries(out: Out, term: string) {
  const q = term.trim().toLowerCase();
  const found = (await getCountries().catch(() => [])).filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20);
  if (!found.length) return out(`No country matches “${esc(term)}”.`, [OTP_ROW, MENU_ROW]);
  return out(`📱 Countries matching “${esc(term)}”:`, [
    ...pairs(found.map((c) => ({ text: c.name.slice(0, 28), callback_data: `oc:${c.id}:0` }))),
    OTP_ROW,
    MENU_ROW,
  ]);
}

/** Apps on sale for a country, popular first, with the ₦ price per number. */
async function appsFor(country: string) {
  // Bot prices (Admin → Telegram bot can set a bot-only markup); checkout charges the same.
  const [apps, price, hidden] = await Promise.all([getApps(country), getOtpPricer("bot"), outOfStockApps(country)]);
  const rank = (name: string) => {
    const i = POPULAR_APPS.indexOf(name);
    return i === -1 ? POPULAR_APPS.length : i;
  };
  return apps
    .filter((a) => !hidden.has(a.name))
    .map((a) => ({ name: a.name, label: a.label, priceNgn: price(a.priceUsd) }))
    .sort((a, b) => rank(a.name) - rank(b.name) || a.label.localeCompare(b.label));
}

export async function showOtpApps(out: Out, country: string, page: number) {
  if (await notOnSale(out)) return;
  let apps: Awaited<ReturnType<typeof appsFor>>;
  try {
    apps = (await appsFor(country)).filter((a) => fits(`ob:${country}:${a.name}`));
  } catch {
    return out("We couldn't load the apps for this country. Please try again.", [OTP_ROW, MENU_ROW]);
  }
  if (!apps.length) return out(`No numbers for ${esc(countryLabel(country))} right now.`, [OTP_ROW, MENU_ROW]);
  const per = 10;
  return out(`📱 <b>${esc(countryLabel(country))}</b>\nPick the app you need a code for:`, [
    ...apps.slice(page * per, page * per + per).map((a) => [{ text: `${a.label.slice(0, 36)} · ${naira(a.priceNgn)}`, callback_data: `ov:${country}:${a.name}` }]),
    ...pager(page, apps.length > (page + 1) * per, (p) => `oc:${country}:${p}`),
    OTP_ROW,
    MENU_ROW,
  ]);
}

export async function confirmOtp(ctx: Ctx, country: string, app: string) {
  const apps = await appsFor(country).catch(() => []);
  const a = apps.find((x) => x.name === app);
  if (!a) return ctx.out("This app just sold out for this country.", [[{ text: "⬅️ Back", callback_data: `oc:${country}:0` }], MENU_ROW]);
  const bal = await balanceOf(ctx.account);
  const what = `A ${esc(a.label)} number (${esc(countryLabel(country))})`;
  if (bal + 0.01 < a.priceNgn) return shortOf(ctx, what, a.priceNgn, bal, `oc:${country}:0`);
  return ctx.out(
    `${what} for <b>${naira(a.priceNgn)}</b>?\n\nUse it within ${OTP_WAIT_MINUTES} minutes. If no code arrives, cancel for a full refund (or it's refunded automatically).\n\nBalance after: about ${naira(bal - a.priceNgn)}`,
    [[{ text: `✅ Buy · ${naira(a.priceNgn)}`, callback_data: `ob:${country}:${app}`, style: "success" }], [{ text: "⬅️ Back", callback_data: `oc:${country}:0` }]],
  );
}

export async function buyOtp(ctx: Ctx, country: string, app: string) {
  const { account, chatId, out } = ctx;
  if (await isUserSuspended(account.userId)) return out(SUSPENDED_MESSAGE, MENU_BUTTON);
  if (!(await claimPurchase(account.telegramId))) return;
  await out("⏳ Getting your number…");
  const r = await placeOtpOrder(account.userId, { country, app }, { channel: "bot" }).finally(() => setPending(account.telegramId, null));
  if (!r.ok) return send(chatId, `❌ ${esc(r.error)}`, [[{ text: "⬅️ Back", callback_data: `oc:${country}:0` }], MENU_ROW]);
  return send(
    chatId,
    `📱 Your ${esc(appLabel(app))} number:\n\n<code>${esc(r.data.number)}</code>\n\nEnter it in ${esc(appLabel(app))}, then tap <b>Check for code</b>.`,
    otpButtons(r.data.id),
  );
}

function otpButtons(id: string): Keyboard {
  return [
    [{ text: "🔄 Check for code", callback_data: `on:${id}`, style: "primary" }],
    [{ text: "❌ Cancel & refund", callback_data: `ox:${id}`, style: "danger" }],
    MENU_ROW,
  ];
}

/** Checks the number (same check as the website: saves the code, or refunds after the wait). */
export async function checkOtp(ctx: Ctx, id: string) {
  const rows = await getOtpOrders(ctx.account.userId);
  const o = rows.find((r) => r.id === id);
  if (!o) return ctx.out("Number not found.", MENU_BUTTON);
  const head = `📱 ${esc(appLabel(o.app))} · ${esc(countryLabel(o.country))}\n<code>${esc(o.number ?? "")}</code>`;
  if (o.status === "received") {
    return ctx.out(`${head}\n\n✅ Code: <code>${esc(o.code ?? "")}</code>${o.sms ? `\n\n${esc(o.sms)}` : ""}`, [
      [{ text: "📱 Another number", callback_data: "ot:0" }],
      MENU_ROW,
    ]);
  }
  if (o.status !== "waiting") return ctx.out(`${head}\n\nThis number was cancelled and refunded to your wallet.`, [OTP_ROW, MENU_ROW]);
  const left = Math.max(0, OTP_WAIT_MINUTES - Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60_000));
  return ctx.out(`${head}\n\n⏳ No code yet. About ${left} min left before it's refunded automatically.`, otpButtons(id));
}

export async function cancelOtp(ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(otpOrder)
    .where(and(eq(otpOrder.id, id), eq(otpOrder.userId, ctx.account.userId)))
    .limit(1);
  if (!row) return ctx.out("Number not found.", MENU_BUTTON);
  const result = await cancelAndRefund(row, "otp_cancelled_by_customer");
  if (!result.ok) {
    return ctx.out(
      `This number can't be cancelled yet. Wait a minute and try again. If no code arrives you're refunded automatically.`,
      otpButtons(id),
    );
  }
  return ctx.out(`❌ Cancelled. <b>${naira(row.amount)}</b> is back in your wallet.`, [OTP_ROW, MENU_ROW]);
}
