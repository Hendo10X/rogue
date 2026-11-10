import { SITE_URL } from "@/lib/site";
import type { Keyboard } from "./api";
import type { BotAccount } from "./accounts";
import { createLinkCode } from "./link";
import { getBotTexts, getSupportUrl, renderText } from "./settings";
import type { Out } from "./ui";

/**
 * The bot is for Rogue Socials members only. Until someone connects, this is
 * all they see: one button that opens the website, where they log in or sign
 * up and are connected automatically (app/connect/telegram). The bot then
 * messages them "✅ Connected" and the full menu works.
 */

const siteName = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

export async function showJoin(out: Out, account: BotAccount, firstName?: string) {
  const [{ join }, support, { code, minutes }] = await Promise.all([getBotTexts(), getSupportUrl(), createLinkCode(account.telegramId)]);
  const keyboard: Keyboard = [
    [{ text: "✅ Log in or sign up to connect", url: `${SITE_URL}/connect/telegram?code=${code}`, style: "success" }],
    [{ text: "🔄 I've connected", callback_data: "m" }, { text: "💬 Support", url: support }],
  ];
  const note = `\n\n<i>The button works for ${minutes} minutes. Send /start for a fresh one.</i>`;
  return out(renderText(join, { name: firstName ?? "there", site: siteName, balance: "₦0" }) + note, keyboard);
}

export function showAlreadyConnected(out: Out) {
  return out("✅ This bot is connected to your Rogue Socials account. To disconnect, go to Settings on the website.", [
    [{ text: "🌐 Open Settings", url: `${SITE_URL}/settings` }],
    [{ text: "🏠 Menu", callback_data: "m", style: "primary" }],
  ]);
}
