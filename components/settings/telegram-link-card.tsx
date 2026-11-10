"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type State = { linked: boolean; username: string | null };

/**
 * Connect the Telegram shop bot to this account: the bot gives a one-time
 * code (🔗 Connect website), entered here. The bot's link opens this page with
 * the code filled in (?tg=CODE).
 */
export function TelegramLinkCard({ botUsername, className }: { botUsername: string | null; className?: string }) {
  const [state, setState] = useState<State | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("tg");
    if (fromLink) setCode(fromLink);
    fetch("/api/account/telegram")
      .then((r) => r.json())
      .then((d: State) => setState(d))
      .catch(() => setState({ linked: false, username: null }));
  }, []);

  async function connect() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setState(d);
      setCode("");
      // Drop the code from the address bar.
      window.history.replaceState(null, "", window.location.pathname);
      toast.success("Telegram connected. The bot now uses this wallet.");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't connect Telegram");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Telegram? Your wallet and orders stay here; the bot will start a new, empty bot wallet.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/telegram", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setState({ linked: false, username: null });
      toast.success("Telegram disconnected");
    } catch {
      toast.error("Couldn't disconnect Telegram");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;
  const botLink = botUsername ? `https://t.me/${botUsername}` : null;
  return (
    <section className={cn("surface flex flex-col gap-3 rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Telegram bot</h3>
        {state.linked && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">Connected</span>}
      </div>
      {state.linked ? (
        <>
          <p className="text-sm text-muted-foreground">
            {state.username ? `@${state.username}` : "Your Telegram"} shops with this account&apos;s wallet and sees these orders.
          </p>
          <div className="flex flex-wrap gap-2">
            {botLink && (
              <a href={botLink} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                Open the bot
              </a>
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Buy OTP numbers and proxies from Telegram with this wallet. Open the bot and tap the green{" "}
            <b>Connect</b> button: it connects automatically. Or enter a code from the bot here.
            {botLink && (
              <>
                {" "}
                <a href={botLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  Open the bot
                </a>
              </>
            )}
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void connect();
            }}
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH"
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              className="h-9 max-w-40 font-mono tracking-wider"
              aria-label="Code from the Telegram bot"
            />
            <Button size="sm" type="submit" disabled={busy || code.replace(/[^A-Za-z0-9]/g, "").length !== 8}>
              {busy ? "Connecting…" : "Connect"}
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
