"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/currency";
import { plainError } from "@/lib/plain-error";
import { appLabel } from "@/lib/otp/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, SectionLabel } from "@/components/page-header";

type Country = { id: string; name: string };
type App = { name: string; label?: string; priceNgn: number };
type Order = {
  id: string;
  country: string;
  app: string;
  number: string | null;
  amount: string;
  status: string;
  code: string | null;
  sms: string | null;
  createdAt: string;
};
type State = { onSale: boolean; countries: Country[]; waitMinutes: number; orders: Order[] };

// Apps people actually ask for float to the top of a very long list.
const POPULAR = ["WhatsApp", "Telegram", "Facebook", "Instagram", "Google", "Gmail", "TikTok", "Twitter", "X", "Snapchat", "Discord", "Microsoft", "Apple", "Amazon", "PayPal", "Tinder", "Uber", "Signal"];

const STATUS: Record<string, string> = { waiting: "Waiting for code…", received: "Code received", cancelled: "Cancelled · refunded" };

/** Buy a one-time number for an app, wait for the SMS code, or cancel for a refund. */
export function OtpShop() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State | null>(null);
  const [country, setCountry] = useState("");
  const [apps, setApps] = useState<App[] | null>(null);
  const [search, setSearch] = useState("");
  const [buying, setBuying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  // Bumped after a failed purchase so the list reloads without the empty app.
  const [appsVersion, setAppsVersion] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/otp");
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Check for codes every 8 seconds while any number is waiting.
  const waiting = state?.orders.some((o) => o.status === "waiting");
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(load, 8_000);
    return () => window.clearInterval(id);
  }, [waiting, load]);

  useEffect(() => {
    setSearch("");
  }, [country]);

  useEffect(() => {
    setApps(null);
    if (!country) return;
    let alive = true;
    fetch(`/api/otp/apps?country=${encodeURIComponent(country)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (alive) setApps(data.apps ?? []);
      })
      .catch((e) => {
        if (alive) setApps([]);
        toast.error(plainError(e, "We couldn't load the apps for this country. Please try again."));
      });
    return () => {
      alive = false;
    };
  }, [country, appsVersion]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (apps ?? []).filter((a) => !q || (a.label ?? a.name).toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    const rank = (a: App) => {
      const i = POPULAR.findIndex((p) => p.toLowerCase() === a.name.toLowerCase());
      return i === -1 ? POPULAR.length : i;
    };
    return list.sort((a, b) => rank(a) - rank(b) || (a.label ?? a.name).localeCompare(b.label ?? b.name)).slice(0, q ? 60 : 24);
  }, [apps, search]);

  async function buy(app: App) {
    setBuying(app.name);
    try {
      const res = await fetch("/api/otp/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, app: app.name }),
      });
      const data = await res.json();
      if (data.soldOut) {
        // Out of numbers: it just drops off the list, no error message.
        setApps((list) => list?.filter((a) => a.name !== app.name) ?? list);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      toast.success(`Your number is ${data.number}. Use it in ${app.label ?? app.name} — the code will show below.`);
      void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      await load();
    } catch (e) {
      toast.error(plainError(e, "We couldn't get a number. Please try again."));
      setAppsVersion((v) => v + 1);
    } finally {
      setBuying(null);
    }
  }

  async function cancel(o: Order) {
    setCancelling(o.id);
    try {
      const res = await fetch("/api/otp/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: o.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Cancelled. Your money is back in your wallet.");
      void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      await load();
    } catch (e) {
      toast.error(plainError(e, "We couldn't cancel this number. Please try again."));
    } finally {
      setCancelling(null);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied.`);
    } catch {
      toast.error("We couldn't copy that. Select it and copy it yourself.");
    }
  }

  if (!state) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {!state.onSale ? (
        <EmptyState title="OTP numbers are coming soon" description="We're getting them ready. Check back shortly." />
      ) : (
        <section className="surface flex flex-col gap-4 rounded-2xl p-5">
          <ol className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>1. Pick a country and the app you&apos;re signing up for.</li>
            <li>2. Enter the number we give you in that app.</li>
            <li>3. The code appears here within a few minutes. No code in {state.waitMinutes} minutes? You&apos;re refunded automatically.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Country</FieldLabel>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  {state.countries.map((c) => (
                    <SelectItem key={c.id || c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>App</FieldLabel>
              <Input placeholder="Search apps, e.g. WhatsApp" value={search} onChange={(e) => setSearch(e.target.value)} disabled={!apps?.length} />
            </Field>
          </div>

          {country && apps === null ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-5" />
            </div>
          ) : apps && apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No numbers for this country right now. Try another one.</p>
          ) : apps ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  disabled={!!buying}
                  onClick={() => buy(a)}
                  className="flex h-12 items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 text-left text-sm transition-colors hover:bg-white/[0.08] disabled:opacity-60"
                >
                  <span className="truncate font-medium">{a.label ?? a.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {buying === a.name ? "Getting number…" : `₦${formatAmount(a.priceNgn)}`}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {apps && apps.length > shown.length && !search && (
            <p className="text-xs text-muted-foreground">Showing popular apps. Search to find any of the {apps.length} apps.</p>
          )}
        </section>
      )}

      {state.orders.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel>Your numbers</SectionLabel>
          {state.orders.map((o) => (
            <div key={o.id} className={cn("surface flex flex-col gap-3 rounded-2xl p-4", o.status === "cancelled" && "opacity-70")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {appLabel(o.app)} · {appLabel(o.country)} · ₦{formatAmount(o.amount)}
                </p>
                <Badge variant={o.status === "received" ? "default" : "secondary"}>{STATUS[o.status] ?? o.status}</Badge>
              </div>
              {o.number && (
                <button
                  type="button"
                  onClick={() => copy(o.number!, "Number")}
                  className="self-start rounded-full bg-white/[0.06] px-3 py-1.5 font-mono text-base tracking-wide tabular-nums hover:bg-white/[0.1]"
                >
                  {o.number}
                </button>
              )}
              {o.status === "received" && (
                <div className="flex flex-col gap-1.5 rounded-xl bg-primary/10 p-3">
                  {o.code && (
                    <button
                      type="button"
                      onClick={() => copy(o.code!, "Code")}
                      className="self-start font-mono text-2xl font-semibold tracking-[0.2em] text-primary tabular-nums"
                    >
                      {o.code}
                    </button>
                  )}
                  {o.sms && <p className="text-xs break-words text-muted-foreground">{o.sms}</p>}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Bought {formatDistanceToNow(new Date(o.createdAt), { addSuffix: true })}</p>
                {o.status === "waiting" && (
                  <Button size="sm" variant="ghost" disabled={cancelling === o.id} onClick={() => cancel(o)}>
                    {cancelling === o.id ? "Cancelling…" : "Cancel & refund"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
