// Canonical site config used across metadata, sitemap, robots and structured data.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://roguesocials.com"
).replace(/\/$/, "");

export const SITE_NAME = "Rogue Socials";

export const SITE_DESCRIPTION =
  "Rogue Socials is a trusted marketplace to buy aged & fresh social media accounts (Instagram, Facebook, TikTok, Twitter, Snapchat) and affordable SMM boosting — with instant delivery and secure crypto & card payments.";

export const SITE_KEYWORDS = [
  "buy social media accounts",
  "buy aged instagram accounts",
  "buy facebook accounts",
  "buy tiktok accounts",
  "buy twitter accounts",
  "buy snapchat accounts",
  "smm panel",
  "cheap smm panel",
  "buy instagram followers",
  "social media marketplace",
  "buy verified accounts",
  "aged social media accounts",
  "Rogue Socials",
];

// Public social profiles for structured data / verification.
export const SITE_SOCIALS = [
  "https://t.me/roguesocials",
  "https://t.me/rogue4l",
];
