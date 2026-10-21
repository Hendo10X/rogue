// The platform marks shipped in /public/svgs. `invert` flags the monochrome
// marks that are drawn dark and need flipping on the dark canvas.
export const PLATFORMS = [
  { name: "Instagram", src: "/svgs/instagram-icon.svg" },
  { name: "TikTok", src: "/svgs/tiktok-icon-dark.svg" },
  { name: "Facebook", src: "/svgs/facebook-icon.svg" },
  { name: "X (Twitter)", src: "/svgs/x_dark.svg" },
  { name: "Telegram", src: "/svgs/telegram.svg" },
  { name: "Threads", src: "/svgs/threads_dark.svg" },
  { name: "WhatsApp", src: "/svgs/whatsapp-icon.svg" },
  { name: "Messenger", src: "/svgs/messenger.svg" },
] as const;
