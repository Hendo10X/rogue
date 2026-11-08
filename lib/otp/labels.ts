/** Apps by Rogue's app id ("whatsapp"); these read better on screen than providers' spellings. */
const NAMES: Record<string, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  tiktok: "TikTok",
  twitter: "X (Twitter)",
  snapchat: "Snapchat",
  discord: "Discord",
  microsoft: "Microsoft",
  apple: "Apple",
  amazon: "Amazon",
  paypal: "PayPal",
  tinder: "Tinder",
  uber: "Uber",
  signal: "Signal",
  viber: "Viber",
  wechat: "WeChat",
  linkedin: "LinkedIn",
  yahoo: "Yahoo",
  openai: "OpenAI (ChatGPT)",
  netflix: "Netflix",
};

/** Display name for an app id; `providerName` (the provider's own spelling) is the fallback. */
export function appLabel(id: string, providerName?: string): string {
  const known = NAMES[id.toLowerCase()];
  if (known) return known;
  const name = providerName?.trim() || id.replace(/-/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}
