"use client";

import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Connects the Telegram account as soon as the page opens (a POST, so a link
 * preview or prefetch can never connect anyone), then sends them back to the bot.
 */
export function AutoConnectTelegram({ code, botLink }: { code: string; botLink: string | null }) {
  const [state, setState] = useState<{ status: "working" } | { status: "done" } | { status: "error"; message: string }>({ status: "working" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/account/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Couldn't connect Telegram");
        setState({ status: "done" });
        // Straight back to the chat, where the bot has said it's connected.
        if (botLink) setTimeout(() => window.location.assign(botLink), 1200);
      })
      .catch((e) => setState({ status: "error", message: e instanceof Error ? e.message : "Couldn't connect Telegram" }));
  }, [code, botLink]);

  if (state.status === "working") return <p className="text-sm text-muted-foreground">Connecting your Telegram…</p>;
  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">{state.message}</p>
        {botLink && (
          <a href={botLink} className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Back to the bot
          </a>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">✅ Telegram connected. You can buy OTP numbers and proxies in the bot with this wallet.</p>
      {botLink && (
        <a href={botLink} className={buttonVariants({ className: "w-full" })}>
          Back to Telegram
        </a>
      )}
    </div>
  );
}
