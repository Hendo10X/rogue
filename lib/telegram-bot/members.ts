import { SITE_URL } from "@/lib/site";
import type { Keyboard } from "./api";
import type { BotAccount } from "./accounts";
import { createLinkCode, prettyCode } from "./link";
import { getBotTexts, renderText } from "./settings";
import type { Out } from "./ui";

/**
 * The bot is for Rogue Socials members only. Until someone connects their
 * account, this is all they see: create an account on the website, or
 * connect the one they have with a one-time code.
 */

const siteName = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

export async function showJoin(out: Out, firstName?: string) {
  const { join } = await getBotTexts();
  const keyboard: Keyboard = [
    [{ text: "📝 Create a free account", url: `${SITE_URL}/signup` }],
    [{ text: "🔗 I'm a member: connect my account", callback_data: "lk" }],
  ];
  return out(renderText(join, { name: firstName ?? "there", site: siteName, balance: "₦0" }), keyboard);
}

export async function showConnectCode(out: Out, account: BotAccount) {
  const { code, minutes } = await createLinkCode(account.telegramId);
  return out(
    [
      "🔗 <b>Connect your Rogue Socials account</b>",
      "",
      `Your code: <code>${prettyCode(code)}</code> (valid ${minutes} minutes)`,
      "",
      "Tap below, log in, and press <b>Connect</b>. I'll message you here when it's done.",
    ].join("\n"),
    [
      [{ text: "🌐 Connect on the website", url: `${SITE_URL}/settings?tg=${code}` }],
      [{ text: "📝 No account yet? Sign up", url: `${SITE_URL}/signup` }],
      [{ text: "✅ I've connected", callback_data: "m" }],
    ],
  );
}

export function showAlreadyConnected(out: Out) {
  return out("✅ This bot is connected to your Rogue Socials account. To disconnect, go to Settings on the website.", [
    [{ text: "🌐 Open Settings", url: `${SITE_URL}/settings` }],
    [{ text: "🏠 Menu", callback_data: "m" }],
  ]);
}
