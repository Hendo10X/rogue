import { getSetting, setSetting } from "@/lib/admin-auth";

/**
 * Where a sale happens. The Telegram bot can have its own markup for OTP
 * numbers and proxies (Admin → Telegram bot), e.g. cheaper than the website.
 * No bot markup set = the website's markup. The same channel is used for the
 * price the bot shows and the price checkout charges.
 */
export type Channel = "web" | "bot";
export type BotProduct = "otp" | "proxy";

const KEY: Record<BotProduct, string> = { otp: "bot_otp_markup_percent", proxy: "bot_proxy_markup_percent" };

/** The bot's own markup %, or null to use the website's. */
export async function botMarkup(product: BotProduct): Promise<number | null> {
  const raw = await getSetting(KEY[product]);
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function setBotMarkup(product: BotProduct, percent: number | null): Promise<void> {
  await setSetting(KEY[product], percent === null ? "" : String(percent));
}

/** The markup to price with for this channel. */
export async function markupFor(product: BotProduct, channel: Channel, websiteMarkup: number): Promise<number> {
  if (channel !== "bot") return websiteMarkup;
  return (await botMarkup(product)) ?? websiteMarkup;
}
