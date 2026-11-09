import { answer, edit, send } from "./api";
import { getOrCreateAccount, isMember, setPending, type BotAccount, type MemberAccount, type Pending, type TgUser } from "./accounts";
import { balanceOf, MENU_BUTTON, naira, type Ctx, type Out } from "./ui";
import { buyOtp, cancelOtp, checkOtp, confirmOtp, searchOtpCountries, showOtpApps, showOtpCountries } from "./otp";
import { onProxyButton, showProxyOrder, showProxyTypes } from "./proxies";
import { askFundAmount, chooseMethod, gotFundAmount, showBalance, showBankTransfer, showFund, startFunding } from "./wallet";
import { showOrders } from "./orders";
import { showAlreadyConnected, showConnectCode, showJoin } from "./members";
import { getBotTexts, renderText } from "./settings";
import type { FundMethod } from "./funding";

/**
 * The Rogue Socials Telegram bot: OTP numbers (SMS) and proxies, paid from the
 * member's Rogue wallet. Members only: until someone connects their Rogue
 * Socials account, they only see how to sign up and connect. Logs and boosting
 * stay on the website. Every purchase goes through the same code as the
 * website, at the bot's prices (Admin → Telegram bot). This file only routes
 * messages and buttons to the sections.
 */

type Message = { message_id: number; chat: { id: number; type: string }; from?: TgUser; text?: string };
type Callback = { id: string; from: TgUser; data?: string; message?: Message };
export type Update = { message?: Message; callback_query?: Callback };

export async function handleUpdate(update: Update): Promise<unknown> {
  if (update.callback_query) return onCallback(update.callback_query);
  const msg = update.message;
  // Private chats only: numbers and proxy logins must never land in a group.
  if (!msg?.from || msg.chat.type !== "private") return;
  const { account } = await getOrCreateAccount(msg.from, msg.chat.id);
  const out: Out = (text, kb) => send(msg.chat.id, text, kb);
  const text = (msg.text ?? "").trim();
  const cmd = text.split(/[\s@]/)[0].toLowerCase();

  if (!isMember(account)) {
    if (cmd === "/connect") return showConnectCode(out, account);
    return showJoin(out, msg.from.first_name);
  }

  const ctx: Ctx = { out, chatId: msg.chat.id, account };
  if (cmd === "/start" || cmd === "/menu") {
    await setPending(account.telegramId, null);
    return showMenu(out, account, msg.from.first_name);
  }
  const command: Record<string, () => Promise<unknown>> = {
    "/balance": () => showBalance(out, account),
    "/orders": () => showOrders(out, account),
    "/fund": () => showFund(out),
    "/otp": () => showOtpCountries(out, 0),
    "/proxies": () => showProxyTypes(out),
    "/connect": () => showAlreadyConnected(out),
    "/help": () => showHelp(out),
  };
  if (command[cmd]) {
    await setPending(account.telegramId, null);
    return command[cmd]();
  }

  // Typed text answers whatever the bot asked for last.
  const pending = account.pending as Pending;
  switch (pending?.kind) {
    case "fund_amount":
      return gotFundAmount(ctx, text);
    case "otp_search":
      await setPending(account.telegramId, null);
      return searchOtpCountries(out, text.slice(0, 40));
  }
  return showMenu(out, account, msg.from.first_name);
}

async function onCallback(cb: Callback): Promise<unknown> {
  const msg = cb.message;
  if (!msg || msg.chat.type !== "private") return void answer(cb.id);
  const { account } = await getOrCreateAccount(cb.from, msg.chat.id);
  const out: Out = (text, kb) => edit(msg.chat.id, msg.message_id, text, kb);
  const [cmd, a, b] = (cb.data ?? "").split(":");
  void answer(cb.id);

  if (!isMember(account)) {
    if (cmd === "lk") return showConnectCode(out, account);
    // "I've connected" lands here while not connected yet.
    if (cmd === "m") await answer(cb.id, "Not connected yet. Press Connect on the website first.");
    return showJoin(out, cb.from.first_name);
  }

  const ctx: Ctx = { out, chatId: msg.chat.id, account };
  const pending = account.pending as Pending;
  switch (cmd) {
    // ── Menu, wallet, orders ──
    case "m":
      await setPending(account.telegramId, null);
      return showMenu(out, account, cb.from.first_name);
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
      return showAlreadyConnected(out);
    case "ord":
      return showOrders(out, account);
    case "help":
      return showHelp(out);

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
      return showMenu(out, account, cb.from.first_name);
  }
}

async function showMenu(out: Out, account: MemberAccount, firstName?: string) {
  const [bal, texts] = await Promise.all([balanceOf(account), getBotTexts()]);
  return out(renderText(texts.welcome, { name: firstName ?? "there", balance: naira(bal) }), [
    [{ text: "📱 OTP numbers", callback_data: "ot:0" }, { text: "🌐 Proxies", callback_data: "px" }],
    [{ text: "💰 Fund wallet", callback_data: "fund" }, { text: "📦 My orders", callback_data: "ord" }],
    [{ text: "❓ Help", callback_data: "help" }],
  ]);
}

async function showHelp(out: Out) {
  const { help } = await getBotTexts();
  return out(renderText(help), MENU_BUTTON);
}

export type { BotAccount };
