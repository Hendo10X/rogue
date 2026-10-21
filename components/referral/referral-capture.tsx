"use client";

import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GiftIcon } from "@hugeicons/core-free-icons";

const COOKIE = "rogue_ref";

/**
 * Remembers a `?ref=` code for 30 days so it survives the email-verify and
 * Google round-trips; the account claims it on its first dashboard visit.
 */
export function ReferralCapture({ code }: { code: string }) {
  useEffect(() => {
    document.cookie = `${COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  }, [code]);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[linear-gradient(120deg,rgb(255_90_31/0.14),rgb(255_211_26/0.05))] px-4 py-3 shadow-[inset_0_0_0_1px_rgb(255_140_60/0.18)] [@media(max-height:760px)]:gap-2 [@media(max-height:760px)]:rounded-full [@media(max-height:760px)]:px-2 [@media(max-height:760px)]:py-1.5">
      <span className="bg-rogue-gradient flex size-8 shrink-0 items-center justify-center rounded-xl text-white [@media(max-height:760px)]:size-6 [@media(max-height:760px)]:rounded-full">
        <HugeiconsIcon icon={GiftIcon} strokeWidth={1.75} className="size-4" />
      </span>
      <p className="text-[0.8125rem] text-foreground/90">
        <span className="[@media(max-height:760px)]:hidden">
          You were invited by a friend. Sign up and fund your wallet to thank them.
        </span>
        <span className="hidden [@media(max-height:760px)]:inline">You were invited by a friend.</span>
      </p>
    </div>
  );
}
