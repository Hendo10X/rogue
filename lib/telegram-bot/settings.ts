import { getSetting, setSetting } from "@/lib/admin-auth";
import { esc } from "./api";

/**
 * Bot messages the admin can edit (Admin → Telegram bot). Placeholders:
 * {name} (customer's first name), {balance} (wallet, e.g. ₦12,500), {site}.
 * Text is plain: it's escaped, line breaks are kept, and **double stars**
 * make bold, so an admin can't break the message by typing < or &.
 */
export type BotTexts = {
  /** Above the main menu for members. */
  welcome: string;
  /** Shown to people who haven't connected a Rogue Socials account yet. */
  join: string;
  /** /help */
  help: string;
};

export const DEFAULT_TEXTS: BotTexts = {
  welcome: "👋 Hi {name}!\n👛 Balance: **{balance}**\n\nWhat would you like?",
  join: [
    "👋 Welcome to **Rogue Socials**.",
    "",
    "This bot is for Rogue Socials members. Create a free account on {site}, then connect it here to buy OTP numbers and proxies with your wallet.",
  ].join("\n"),
  help: [
    "**How it works**",
    "1. 💰 Fund your wallet: card, transfer, USSD or bank transfer.",
    "2. 📱 Buy OTP numbers or 🌐 proxies from your balance.",
    "3. Numbers, codes and proxies arrive right here, and stay under 📦 My orders.",
    "",
    "🔐 2FA code: send a 2FA secret (or a whole log line) and get the login code.",
    "Failed orders are refunded to your wallet automatically.",
    "Need help? Tap 💬 Text support.",
    "",
    "Commands: /menu /otp /proxies /2fa /fund /balance /orders",
  ].join("\n"),
};

const KEY = "bot_texts";
export const TEXT_LIMIT = 2000;

export async function getBotTexts(): Promise<BotTexts> {
  try {
    const raw = await getSetting(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<BotTexts>) : {};
    return {
      welcome: saved.welcome?.trim() || DEFAULT_TEXTS.welcome,
      join: saved.join?.trim() || DEFAULT_TEXTS.join,
      help: saved.help?.trim() || DEFAULT_TEXTS.help,
    };
  } catch {
    return DEFAULT_TEXTS;
  }
}

/** Saves the texts; an empty one goes back to its default. */
export async function setBotTexts(next: Partial<BotTexts>): Promise<BotTexts> {
  const current = await getBotTexts();
  const merged: BotTexts = { ...current };
  for (const k of Object.keys(DEFAULT_TEXTS) as (keyof BotTexts)[]) {
    if (next[k] === undefined) continue;
    const v = String(next[k]).trim().slice(0, TEXT_LIMIT);
    merged[k] = v || DEFAULT_TEXTS[k];
  }
  await setSetting(KEY, JSON.stringify(merged));
  return merged;
}

/** Admin-written text → safe Telegram HTML, with placeholders filled in. */
export function renderText(template: string, vars: Record<string, string> = {}): string {
  let out = esc(template);
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(esc(v));
  return out.replace(/\*\*([\s\S]+?)\*\*/g, "<b>$1</b>");
}

// ── Support link ────────────────────────────────────────────────────────────

const SUPPORT_KEY = "bot_support_url";

/**
 * Where the bot's 💬 Support button goes: the owner's Telegram (e.g.
 * https://t.me/rogue4l). Set in Admin → Telegram bot; until then, the same
 * contact customers send bank-transfer receipts to.
 */
export async function getSupportUrl(): Promise<string> {
  const saved = (await getSetting(SUPPORT_KEY))?.trim();
  if (saved) return saved;
  const { getManualFunding } = await import("@/lib/manual-funding");
  return (await getManualFunding()).proofUrl;
}

/** "@rogue4l", "rogue4l" or a full https link → a link Telegram can open. Null if it's not usable. */
export function normaliseSupportUrl(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  const handle = v.replace(/^@/, "").replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, "");
  if (/^[A-Za-z0-9_]{4,32}$/.test(handle)) return `https://t.me/${handle}`;
  return /^https:\/\/\S+$/i.test(v) ? v : null;
}

export async function setSupportUrl(input: string): Promise<string> {
  const url = input.trim() ? normaliseSupportUrl(input) : "";
  if (url === null) throw new Error("Use a Telegram @username or a link starting with https://");
  await setSetting(SUPPORT_KEY, url);
  return getSupportUrl();
}
