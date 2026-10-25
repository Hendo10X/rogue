"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { formatAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, SectionLabel } from "@/components/page-header";

type Option = { id: string; name: string };
type Credential = { ip: string; portHttp: number | null; portSocks: number | null; login: string; password: string };
type Order = {
  id: string;
  country: string;
  period: string;
  quantity: number;
  amount: string;
  status: string;
  proxies: Credential[] | null;
  expiresAt: string | null;
  createdAt: string;
};
type State = { onSale: boolean; countries: Option[]; periods: Option[]; maxQuantity: number; orders: Order[] };

function credentialLine(p: Credential) {
  return `${p.ip}:${p.portHttp ?? p.portSocks ?? ""}:${p.login}:${p.password}`;
}

/** Buy dedicated IPv4 proxies from the wallet and see the credentials. */
export function ProxyShop() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State | null>(null);
  const [country, setCountry] = useState("");
  const [period, setPeriod] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/proxies");
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // New orders take a moment at the supplier; check again until they're ready.
  const processing = state?.orders.some((o) => o.status === "processing");
  useEffect(() => {
    if (!processing) return;
    const id = window.setInterval(load, 15_000);
    return () => window.clearInterval(id);
  }, [processing, load]);

  // A fresh price whenever the choice changes (debounced, server-priced).
  useEffect(() => {
    setPrice(null);
    const qty = Number(quantity);
    if (!country || !period || !Number.isInteger(qty) || qty < 1) return;
    setQuoting(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/proxies/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country, period, quantity: qty }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPrice(data.priceNgn);
      } catch (e) {
        toast.error(e instanceof Error && e.message ? e.message : "Couldn't get a price");
      } finally {
        setQuoting(false);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [country, period, quantity]);

  async function buy() {
    setBuying(true);
    try {
      const res = await fetch("/api/proxies/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, period, quantity: Number(quantity) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Order placed. Your proxies will appear below in a minute.");
      void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      await load();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Order failed");
    } finally {
      setBuying(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
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
        <EmptyState title="Proxies are coming soon" description="We're getting them ready. Check back shortly." />
      ) : (
        <section className="surface flex flex-col gap-4 rounded-2xl p-5">
          <FieldGroup className="grid gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel>Country</FieldLabel>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  {state.countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Period</FieldLabel>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="How long" />
                </SelectTrigger>
                <SelectContent>
                  {state.periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Quantity</FieldLabel>
              <Input type="number" min={1} max={state.maxQuantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
          </FieldGroup>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Dedicated IPv4 · HTTP and SOCKS5
              {quoting ? " · pricing…" : price != null ? ` · ₦${formatAmount(price)} total` : ""}
            </p>
            <Button onClick={buy} disabled={buying || quoting || price == null}>
              {buying ? "Buying…" : price != null ? `Buy for ₦${formatAmount(price)}` : "Buy"}
            </Button>
          </div>
        </section>
      )}

      {state.orders.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel>Your proxies</SectionLabel>
          {state.orders.map((o) => (
            <div key={o.id} className="surface flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {o.quantity} × {o.country} · {o.period} · ₦{formatAmount(o.amount)}
                </p>
                <Badge variant={o.status === "active" ? "default" : "secondary"}>
                  {o.status === "processing" ? "Setting up…" : o.status}
                </Badge>
              </div>
              {o.proxies && o.proxies.length > 0 && (
                <div className="rounded-xl bg-black/25">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">ip:port:login:password</span>
                    <Button variant="ghost" size="xs" onClick={() => copy(o.proxies!.map(credentialLine).join("\n"))}>
                      Copy all
                    </Button>
                  </div>
                  <pre className="max-h-48 overflow-y-auto px-3 py-2.5 font-mono text-[0.6875rem] leading-relaxed break-all whitespace-pre-wrap">
                    {o.proxies.map(credentialLine).join("\n")}
                  </pre>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Bought {formatDistanceToNow(new Date(o.createdAt), { addSuffix: true })}
                {o.expiresAt ? ` · expires ${formatDistanceToNow(new Date(o.expiresAt), { addSuffix: true })}` : ""}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
