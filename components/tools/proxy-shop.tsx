"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, SectionLabel } from "@/components/page-header";

type ProxyType = "ipv4" | "isp" | "ipv6" | "mobile";
type Option = { id: string; name: string };
type Operator = { id: string; name: string; rotations: { id: number; name: string }[] };
type Catalog = { countries: Option[]; periods: Option[]; operators?: Record<string, Operator[]> };
type Credential = { ip: string; portHttp: number | null; portSocks: number | null; login: string; password: string };
type Order = {
  id: string;
  proxyType?: string;
  country: string;
  period: string;
  quantity: number;
  amount: string;
  status: string;
  proxies: Credential[] | null;
  expiresAt: string | null;
  createdAt: string;
};
type State = { onSale: boolean; catalogs: Partial<Record<ProxyType, Catalog>>; maxQuantity: number; orders: Order[] };

/** What each type is, in plain words, so customers can pick without knowing proxy jargon. */
const TYPES: { id: ProxyType; name: string; tagline: string; details: string[] }[] = [
  {
    id: "isp",
    name: "ISP",
    tagline: "Best for social accounts",
    details: [
      "Static IPs registered to real home internet providers, so sites see a normal household connection.",
      "Datacenter speed with the trust of a home IP. The safest pick for Facebook, Instagram and TikTok logs.",
      "The IP never changes, and it's only yours.",
    ],
  },
  {
    id: "ipv4",
    name: "IPv4",
    tagline: "Fast, private, all-round",
    details: [
      "Private datacenter IPs, used by you alone for the whole period.",
      "Very fast and stable, and works on every website.",
      "Good for most tasks. Strict sites can tell it's a datacenter IP.",
    ],
  },
  {
    id: "mobile",
    name: "Mobile",
    tagline: "Hardest to block",
    details: [
      "Real 4G/5G mobile network IPs. Sites rarely block them, because thousands of phone users share each IP.",
      "The IP can change on a timer you choose, or whenever you open a change link.",
      "The most expensive, and the strongest for creating or warming accounts.",
    ],
  },
  {
    id: "ipv6",
    name: "IPv6",
    tagline: "Cheapest, limited support",
    details: [
      "Very cheap, so you can buy many at once.",
      "Only works on sites that support IPv6 (Google, YouTube, Facebook, Instagram and some others). Many sites don't.",
      "Choose HTTPS or SOCKS5 when buying.",
    ],
  },
];

function credentialLine(p: Credential) {
  return `${p.ip}:${p.portHttp ?? p.portSocks ?? ""}:${p.login}:${p.password}`;
}

function typeName(id?: string) {
  return TYPES.find((t) => t.id === id)?.name ?? "IPv4";
}

/** Buy proxies from the wallet and see the credentials. */
export function ProxyShop() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State | null>(null);
  const [type, setType] = useState<ProxyType>("isp");
  const [country, setCountry] = useState("");
  const [period, setPeriod] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [operator, setOperator] = useState("");
  const [rotation, setRotation] = useState("");
  const [protocol, setProtocol] = useState("HTTPS");
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

  const available = TYPES.filter((t) => (state?.catalogs[t.id]?.countries.length ?? 0) > 0);
  const catalog = state?.catalogs[type];
  const operators = useMemo(() => (country ? catalog?.operators?.[country] ?? [] : []), [catalog, country]);
  const rotations = operators.find((o) => o.id === operator)?.rotations ?? [];
  const info = TYPES.find((t) => t.id === type)!;

  // Keep the picked type valid once the catalog arrives.
  useEffect(() => {
    if (available.length && !available.some((t) => t.id === type)) setType(available[0].id);
  }, [available, type]);

  function chooseType(next: ProxyType) {
    setType(next);
    setCountry("");
    setPeriod("");
    setOperator("");
    setRotation("");
  }

  const ready =
    !!country && !!period && Number.isInteger(Number(quantity)) && Number(quantity) >= 1 && (type !== "mobile" || (!!operator && rotation !== ""));

  const spec = useMemo(
    () => ({
      type,
      country,
      period,
      quantity: Number(quantity),
      ...(type === "mobile" ? { operator, rotation: Number(rotation) } : {}),
      ...(type === "ipv6" ? { protocol } : {}),
    }),
    [type, country, period, quantity, operator, rotation, protocol],
  );

  // A fresh server price whenever the choice changes (debounced).
  useEffect(() => {
    setPrice(null);
    if (!ready) return;
    setQuoting(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/proxies/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(spec),
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
  }, [ready, spec]);

  async function buy() {
    setBuying(true);
    try {
      const res = await fetch("/api/proxies/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
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
      {!state.onSale || available.length === 0 ? (
        <EmptyState title="Proxies are coming soon" description="We're getting them ready. Check back shortly." />
      ) : (
        <>
          <div role="radiogroup" aria-label="Proxy type" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {available.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={type === t.id}
                onClick={() => chooseType(t.id)}
                className={cn(
                  "surface flex flex-col gap-0.5 rounded-2xl px-4 py-3 text-left transition-colors",
                  type === t.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="text-sm font-medium text-foreground">{t.name}</span>
                <span className="text-xs">{t.tagline}</span>
              </button>
            ))}
          </div>

          <section className="surface flex flex-col gap-4 rounded-2xl p-5">
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              {info.details.map((d) => (
                <li key={d} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                  {d}
                </li>
              ))}
            </ul>

            <FieldGroup className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>Country</FieldLabel>
                <Select
                  value={country}
                  onValueChange={(v) => {
                    setCountry(v);
                    setOperator("");
                    setRotation("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog?.countries.map((c) => (
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
                    {catalog?.periods.map((p) => (
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

              {type === "mobile" && (
                <>
                  <Field>
                    <FieldLabel>Mobile network</FieldLabel>
                    <Select
                      value={operator}
                      onValueChange={(v) => {
                        setOperator(v);
                        setRotation("");
                      }}
                      disabled={!country}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={country ? "Choose a network" : "Pick a country first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Change IP</FieldLabel>
                    <Select value={rotation} onValueChange={setRotation} disabled={!operator}>
                      <SelectTrigger>
                        <SelectValue placeholder="How often" />
                      </SelectTrigger>
                      <SelectContent>
                        {rotations.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.id === 0 ? "When I open the change link" : r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}

              {type === "ipv6" && (
                <Field>
                  <FieldLabel>Protocol</FieldLabel>
                  <Select value={protocol} onValueChange={setProtocol}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HTTPS">HTTPS</SelectItem>
                      <SelectItem value="SOCKS5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </FieldGroup>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {info.name}
                {quoting ? " · pricing…" : price != null ? ` · ₦${formatAmount(price)} total` : ""}
              </p>
              <Button onClick={buy} disabled={buying || quoting || price == null}>
                {buying ? "Buying…" : price != null ? `Buy for ₦${formatAmount(price)}` : "Buy"}
              </Button>
            </div>
          </section>
        </>
      )}

      {state.orders.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel>Your proxies</SectionLabel>
          {state.orders.map((o) => (
            <div key={o.id} className="surface flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {o.quantity} × {typeName(o.proxyType)} · {o.country} · {o.period} · ₦{formatAmount(o.amount)}
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
