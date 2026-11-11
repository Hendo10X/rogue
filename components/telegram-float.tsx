"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Telegram's paper-plane mark (used as-is to link to Telegram). */
function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="currentColor">
      <path d="M9.78 15.27 9.6 19.3c.36 0 .52-.16.71-.35l1.7-1.63 3.53 2.58c.65.36 1.11.17 1.29-.6l2.33-10.94c.21-.97-.35-1.35-.98-1.12L4.5 12.6c-.94.37-.93.89-.16 1.13l3.5 1.09 8.12-5.12c.38-.25.73-.11.44.14z" />
    </svg>
  );
}

const HIDDEN_ON = ["/ozymandias", "/connect/telegram"];

/**
 * A floating button, bottom-right on every page, that opens the Rogue Socials
 * Telegram bot (OTP numbers, proxies, 2FA codes). Hidden on admin pages and
 * when the bot isn't set up.
 */
export function TelegramFloat() {
  const pathname = usePathname();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/telegram/link")
      .then((r) => r.json())
      .then((d: { url?: string | null }) => {
        if (alive) setUrl(d.url ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!url || HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Open the Rogue Socials Telegram bot"
      title="Buy OTP numbers and proxies on Telegram"
      className="group fixed right-4 bottom-4 z-40 flex h-13 items-center gap-2 rounded-full bg-[#229ED9] pr-4 pl-3.5 text-white shadow-lg shadow-black/30 ring-1 ring-white/10 transition hover:bg-[#1b8dc4] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none sm:right-6 sm:bottom-6 max-sm:size-13 max-sm:justify-center max-sm:p-0"
    >
      <TelegramMark />
      <span className="text-sm font-medium whitespace-nowrap max-sm:hidden">Buy on Telegram</span>
    </a>
  );
}
