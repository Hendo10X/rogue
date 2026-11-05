"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/page-header";

type Data = {
  configured: boolean;
  username?: string | null;
  connected?: boolean;
  lastError?: string | null;
  customers?: number | null;
};

/** Status of the Telegram shop bot, and a button to connect it to the site. */
export function ShopBotSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/telegram-bot")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Failed to load the Telegram bot status"));
  }, []);

  useEffect(load, [load]);

  async function connect() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/telegram-bot", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("The bot is connected.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't connect the bot");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface flex flex-col gap-4 rounded-2xl p-5">
      <SectionLabel>Telegram shop bot</SectionLabel>
      {!data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data.configured ? (
        <p className="text-sm text-muted-foreground">
          Not set up. Create a bot with @BotFather, then add TELEGRAM_SHOP_BOT_TOKEN and TELEGRAM_SHOP_BOT_SECRET in Vercel.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-muted-foreground">Bot</p>
              <p className="mt-1 font-medium">{data.username ? `@${data.username}` : "—"}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-muted-foreground">Customers</p>
              <p className="mt-1 font-medium tabular-nums">{data.customers ?? "—"}</p>
            </div>
          </div>
          <p className="text-sm">
            {data.connected ? "✅ Connected: customers can use the bot." : "Not connected yet. Press Connect to switch it on."}
          </p>
          {data.lastError && <p className="text-xs text-muted-foreground">Last Telegram error: {data.lastError}</p>}
          <Button onClick={connect} disabled={busy} variant={data.connected ? "outline" : "default"} className="self-start">
            {busy ? "Connecting…" : data.connected ? "Reconnect" : "Connect"}
          </Button>
        </>
      )}
    </section>
  );
}
