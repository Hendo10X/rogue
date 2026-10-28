/** 5sim names apps by lowercase id ("whatsapp"); these read better on screen. */
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

export function appLabel(id: string): string {
  return NAMES[id.toLowerCase()] ?? id.charAt(0).toUpperCase() + id.slice(1);
}
