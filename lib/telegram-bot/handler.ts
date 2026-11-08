import { answer, edit, esc, send } from "./api";
import { getOrCreateAccount, setPending, type BotAccount, type Pending, type TgUser } from "./accounts";
import { getPlatforms } from "./catalog";
import { balanceOf, MENU_BUTTON, naira, type Ctx, type Out } from "./ui";
import { buyLog, confirmBuy, showListing, showListings, showLogOrder, showLogOrderRaw, showPlatforms } from "./logs";
import {
  askBoostLink,
  confirmBoost,
  gotBoostLink,
  placeBoost,
  searchBoostServices,
  showBoostCategories,
  showBoostService,
  showBoostServices,
} from "./boosting";
import { buyOtp, cancelOtp, checkOtp, confirmOtp, searchOtpCountries, showOtpApps, showOtpCountries } from "./otp";
import { onProxyButton, showProxyOrder, showProxyTypes } from "./proxies";
import { askFundAmount, chooseMethod, gotFundAmount, showBalance, showBankTransfer, showConnect, showFund, startFunding } from "./wallet";
import { showBoostOrder, showOrders } from "./orders";
import type { FundMethod } from "./funding";

/**
 * The Rogue Socials shop bot: logs, boosting, OTP numbers and proxies, paid
 * from the customer's Rogue wallet. Every purchase goes through the same code
 * as the website. This file only routes messages and buttons to the sections.
 */

type Message = { message_id: number; chat: { id: number; type: string }; from?: TgUser; text?: string };
type Callback = { id: string; from: TgUser; data?: string; message?: Message };
export type Update = { message?: Message; callback_query?: Callback };

export async function handleUpdate(update: Update): Promise<unknown> {
  if (update.callback_query) return onCallback(update.callback_query);
  const msg = update.message;
  // Private chats only: login details must never land in a group.
  if (!msg?.from || msg.chat.type !== "private") return;
  const { account, isNew } = await getOrCreateAccount(msg.from, msg.chat.id);
  const ctx: Ctx = { out: (text, kb) => send(msg.chat.id, text, kb), chatId: msg.chat.id, account };
  const text = (msg.text ?? "").trim();

  if (text.startsWith("/start") || text === "/menu") {
    await setPending(account.telegramId, null);
    return showMenu(ctx.out, account, isNew ? msg.from.first_name : undefined);
  }
  const command: Record<string, () => Promise<unknown>> = {
    "/balance": () => showBalance(ctx.out, account),
    "/orders": () => showOrders(ctx.out, account),
    "/fund": () => showFund(ctx.out),
    "/logs": () => showPlatforms(ctx.out),
    "/boost": () => showBoostCategories(ctx.out, 0),
    "/otp": () => showOtpCountries(ctx.out, 0),
    "/proxies": () => showProxyTypes(ctx.out),
    "/connect": () => showConnect(ctx),
    "/help": () => showHelp(ctx.out),
  };
  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  if (command[cmd]) {
    await setPending(account.telegramId, null);
    return command[cmd]();
  }

  // Typed text answers whatever the bot asked for last.
  const pending = account.pending as Pending;
  switch (pending?.kind) {
    case "fund_amount":
      return gotFundAmount(ctx, text);
    case "boost_link":
      return gotBoostLink(ctx, pending.serviceId, text);
    case "boost_qty":
    case "boost_ready":
      return confirmBoost(ctx, pending, Math.round(Number(text.replace(/[,\s]/g, ""))));
    case "boost_search":
      await setPending(account.telegramId, null);
      return searchBoostServices(ctx.out, text.slice(0, 60));
    case "otp_search":
      await setPending(account.telegramId, null);
      return searchOtpCountries(ctx.out, text.slice(0, 40));
  }
  // Anything else typed is a log search.
  if (text && !text.startsWith("/")) {
    await setPending(account.telegramId, null);
    return showListings(ctx.out, { search: text.slice(0, 60), page: 0 });
  }
  return showMenu(ctx.out, account);
}

async function onCallback(cb: Callback): Promise<unknown> {
  const msg = cb.message;
  if (!msg || msg.chat.type !== "private") return void answer(cb.id);
  const { account } = await getOrCreateAccount(cb.from, msg.chat.id);
  const ctx: Ctx = { out: (text, kb) => edit(msg.chat.id, msg.message_id, text, kb), chatId: msg.chat.id, account };
  const { out } = ctx;
  const [cmd, a, b] = (cb.data ?? "").split(":");
  const pending = account.pending as Pending;
  void answer(cb.id);

  switch (cmd) {
    // ── Menu, wallet, orders ──
    case "m":
      await setPending(account.telegramId, null);
      return showMenu(out, account);
    case "bal":
      return showBalance(out, account);
    case "fund":
      return showFund(out);
    case "f":
      return chooseMethod(ctx, Number(a));
    case "fo":
      return askFundAmount(ctx);
    case "fp":
      return startFunding(ctx, a as FundMethod, Number(b));
    case "fbk":
      return showBankTransfer(out);
    case "lk":
      return showConnect(ctx);
    case "ord":
      return showOrders(out, account);
    case "help":
      return showHelp(out);

    // ── Logs ──
    case "shop":
      return showPlatforms(out);
    case "pl": {
      const platform = (await getPlatforms())[Number(a)];
      if (!platform) return showPlatforms(out);
      return showListings(out, { platform, platformIndex: Number(a), page: Number(b) || 0 });
    }
    case "sr":
      return showListings(out, { search: safeDecode(b ?? ""), page: Number(a) || 0 });
    case "srch":
      await setPending(account.telegramId, { kind: "search" });
      return out("🔎 Type what you're looking for, e.g. <b>instagram</b> or <b>facebook aged</b>.", MENU_BUTTON);
    case "l":
      return showListing(out, a);
    case "q":
      return confirmBuy(ctx, a, Number(b) || 1);
    case "b":
      return buyLog(ctx, a, Number(b) || 1);
    case "o":
      return showLogOrder(ctx, a);
    case "or":
      return showLogOrderRaw(ctx, a);

    // ── Boosting ──
    case "bs":
      return showBoostCategories(out, Number(a) || 0);
    case "bc":
      return showBoostServices(out, Number(a), Number(b) || 0);
    case "bss":
      await setPending(account.telegramId, { kind: "boost_search" });
      return out("🔎 Type what you want to boost, e.g. <b>instagram followers</b> or <b>tiktok views</b>.", MENU_BUTTON);
    case "bsr":
      return searchBoostServices(out, safeDecode(b ?? ""), Number(a) || 0);
    case "bv":
      return showBoostService(out, Number(a));
    case "bo":
      return askBoostLink(ctx, Number(a));
    case "bq":
      return confirmBoost(ctx, pending, Number(a));
    case "bx":
      return placeBoost(ctx, pending);
    case "bd":
      return showBoostOrder(ctx, a);

    // ── OTP numbers ──
    case "ot":
      return showOtpCountries(out, Number(a) || 0);
    case "ots":
      await setPending(account.telegramId, { kind: "otp_search" });
      return out("🔎 Type a country name, e.g. <b>united states</b>.", MENU_BUTTON);
    case "oc":
      return showOtpApps(out, a, Number(b) || 0);
    case "ov":
      return confirmOtp(ctx, a, b);
    case "ob":
      return buyOtp(ctx, a, b);
    case "on":
      return checkOtp(ctx, a);
    case "ox":
      return cancelOtp(ctx, a);

    // ── Proxies ──
    case "px":
    case "pt":
    case "pcp":
    case "pco":
    case "ppe":
    case "pop":
    case "pro":
    case "ppr":
    case "pq":
    case "pb":
      return onProxyButton(ctx, pending, cmd, a);
    case "po":
      return showProxyOrder(ctx, a);

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

async function showMenu(out: Out, account: BotAccount, welcomeName?: string) {
  const bal = await balanceOf(account);
  const hello = welcomeName ? `👋 Welcome to <b>Rogue Socials</b>, ${esc(welcomeName)}! Your wallet is ready.\n\n` : "";
  return out(`${hello}👛 Balance: <b>${naira(bal)}</b>\n\nWhat would you like?`, [
    [{ text: "🛒 Logs", callback_data: "shop" }, { text: "🚀 Boosting", callback_data: "bs:0" }],
    [{ text: "📱 OTP numbers", callback_data: "ot:0" }, { text: "🌐 Proxies", callback_data: "px" }],
    [{ text: "💰 Fund wallet", callback_data: "fund" }, { text: "📦 My orders", callback_data: "ord" }],
    [{ text: "🔗 Connect website", callback_data: "lk" }, { text: "❓ Help", callback_data: "help" }],
  ]);
}

function showHelp(out: Out) {
  return out(
    [
      "<b>How it works</b>",
      "1. 💰 Fund your wallet: card, transfer, USSD, crypto or bank transfer.",
      "2. 🛍 Buy logs, boosting, OTP numbers or proxies from your balance.",
      "3. 🔑 Logins, numbers, codes and proxies arrive right here, and stay under 📦 My orders.",
      "",
      "Failed orders are refunded to your wallet automatically.",
      "Have a website account? Tap 🔗 Connect website to use the same wallet.",
      "Tip: just type a word like <b>instagram</b> to search logs.",
      "",
      "Commands: /menu /logs /boost /otp /proxies /fund /balance /orders /connect",
    ].join("\n"),
    MENU_BUTTON,
  );
}
