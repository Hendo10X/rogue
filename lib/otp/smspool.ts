/**
 * SMSPool (smspool.net) native API: https://api.smspool.net, Bearer key,
 * form-encoded POSTs, USD prices. A country + app is sold from several
 * *pools*, each with its own price, stock and success rate, so a quote picks
 * the cheapest pool that has numbers and a good enough success rate, and the
 * purchase is pinned to that pool and price. Notes: docs/otp-providers.md.
 */
import { appId, countryId } from "./catalog";
import { appLabel } from "./labels";
import {
  cached,
  codeFrom,
  OtpProviderError,
  type OtpCheck,
  type OtpCountry,
  type OtpProvider,
  type ProviderApp,
  type Quote,
} from "./types";

const BASE = "https://api.smspool.net";
const ENV = "SMSPOOL_API_KEY";

async function call<T>(path: string, body?: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<T> {
  const key = process.env[ENV]?.trim();
  if (!key) throw new OtpProviderError("SMSPool isn't configured");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: method === "POST" ? new URLSearchParams(body ?? {}) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    throw new OtpProviderError(`SMSPool unreachable (${err instanceof Error ? err.name : "network"})`);
  }
  if (res.status === 429) throw new OtpProviderError("SMSPool is rate limiting us; try again in a moment");
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new OtpProviderError(text.trim().slice(0, 200) || `SMSPool error (HTTP ${res.status})`);
  }
  const j = json as { success?: unknown; message?: unknown; errors?: unknown };
  if (!res.ok || j?.success === 0 || j?.success === false) {
    const msg = typeof j?.message === "string" ? j.message : JSON.stringify(j?.errors ?? json).slice(0, 200);
    throw new OtpProviderError(msg || `SMSPool error (HTTP ${res.status})`);
  }
  return json as T;
}

type Catalog = {
  countries: Map<string, string>; // Rogue id → SMSPool country ID
  names: OtpCountry[];
  services: Map<string, string>; // SMSPool service ID → name
};

const catalog = cached<Catalog>(6 * 60 * 60 * 1000, async () => {
  const [countriesRaw, servicesRaw] = await Promise.all([
    call<Array<{ ID?: unknown; name?: unknown; short_name?: unknown }>>("/country/retrieve_all", undefined, "GET"),
    call<Array<{ ID?: unknown; name?: unknown }>>("/service/retrieve_all", undefined, "GET"),
  ]);
  const countries = new Map<string, string>();
  const names: OtpCountry[] = [];
  for (const c of countriesRaw ?? []) {
    const name = String(c?.name ?? "").trim();
    const id = name ? countryId(name, typeof c?.short_name === "string" ? c.short_name : null) : null;
    if (!id || c?.ID === undefined || countries.has(id)) continue;
    countries.set(id, String(c.ID));
    names.push({ id, name });
  }
  const services = new Map<string, string>();
  for (const s of servicesRaw ?? []) if (s?.ID !== undefined && s?.name) services.set(String(s.ID), String(s.name));
  return { countries, names, services };
});

function serviceId(cat: Catalog, app: string): string | null {
  for (const [id, name] of cat.services) if (appId(name) === app) return id;
  return null;
}

type PoolPrice = { service: unknown; service_name?: unknown; pool: unknown; price: unknown };

export const smspool: OtpProvider = {
  name: "smspool",
  envKey: ENV,
  configured: () => !!process.env[ENV]?.trim(),

  async countries() {
    return (await catalog()).names;
  },

  /** Every service with its cheapest pool price. SMSPool's list has no stock, so `stock` is null. */
  async apps(country) {
    const cat = await catalog();
    const cid = cat.countries.get(country);
    if (cid === undefined) return [];
    const rows = await call<PoolPrice[]>("/request/pricing", { country: cid });
    const cheapest = new Map<string, { name: string; priceUsd: number }>();
    for (const r of Array.isArray(rows) ? rows : []) {
      const price = Number(r.price);
      const sid = String(r.service);
      if (!(price > 0)) continue;
      const name = String(r.service_name ?? cat.services.get(sid) ?? sid);
      const prev = cheapest.get(sid);
      if (!prev || price < prev.priceUsd) cheapest.set(sid, { name, priceUsd: price });
    }
    const out: ProviderApp[] = [];
    for (const { name, priceUsd } of cheapest.values()) {
      const app = appId(name);
      out.push({ app, label: appLabel(app, name), priceUsd, stock: null });
    }
    return out;
  },

  /**
   * The cheapest pool with numbers whose success rate meets the minimum. A
   * cheap pool where half the numbers never get a code (USA WhatsApp was 54%)
   * costs customers time and us failed-order pauses, so it's skipped.
   */
  async quote(country, app, { minSuccessRate }): Promise<Quote | null> {
    const cat = await catalog();
    const cid = cat.countries.get(country);
    const sid = serviceId(cat, app);
    if (cid === undefined || !sid) return null;
    const rows = await call<PoolPrice[]>("/request/pricing", { country: cid, service: sid });
    const pools = (Array.isArray(rows) ? rows : [])
      .map((r) => ({ pool: String(r.pool), price: Number(r.price) }))
      .filter((p) => p.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 6);
    for (const p of pools) {
      const [price, stock] = await Promise.all([
        call<{ price?: unknown; success_rate?: unknown }>("/request/price", { country: cid, service: sid, pool: p.pool }),
        call<{ amount?: unknown }>("/sms/stock", { country: cid, service: sid, pool: p.pool }),
      ]);
      const amount = Number(stock?.amount);
      const rate = Number(price?.success_rate);
      const priceUsd = Number(price?.price) || p.price;
      if (!(amount > 0)) continue;
      if (Number.isFinite(rate) && rate < minSuccessRate) continue;
      return { provider: "smspool", priceUsd, stock: amount, pool: p.pool, successRate: Number.isFinite(rate) ? rate : undefined };
    }
    return null;
  },

  async buy(country, app, quote) {
    const cat = await catalog();
    const cid = cat.countries.get(country);
    const sid = serviceId(cat, app);
    if (cid === undefined || !sid) throw new OtpProviderError("out of stock");
    const data = await call<{ order_id?: unknown; number?: unknown; cc?: unknown; phonenumber?: unknown; cost?: unknown }>("/purchase/sms", {
      country: cid,
      service: sid,
      max_price: String(quote.priceUsd),
      pricing_option: "0",
      ...(quote.pool ? { pool: quote.pool } : {}),
    });
    const number = data?.number ? String(data.number) : data?.phonenumber ? `${data.cc ?? ""}${data.phonenumber}` : "";
    if (!data?.order_id || !number) {
      console.error("[OTP] unexpected SMSPool buy answer", JSON.stringify(data).slice(0, 300));
      throw new OtpProviderError("SMSPool returned no number");
    }
    return { numberId: String(data.order_id), number, priceUsd: Number(data.cost) || quote.priceUsd };
  },

  /** status 1 = waiting, 3 = code received, 6 = refunded; 2 (expired) and 5 (cancelled) are closed too. */
  async check(numberId): Promise<OtpCheck> {
    const data = await call<{ status?: unknown; sms?: unknown; full_sms?: unknown }>("/sms/check", { orderid: numberId });
    const status = Number(data?.status);
    if (status === 3) {
      const sms = typeof data?.full_sms === "string" && data.full_sms.trim() ? data.full_sms.trim() : null;
      const code = (typeof data?.sms === "string" && data.sms.trim()) || codeFrom(sms);
      return { status: "RECEIVED", code: code || null, sms };
    }
    if (status === 2 || status === 5 || status === 6) return { status: "CANCELED", code: null, sms: null };
    return { status: "PENDING", code: null, sms: null };
  },

  async cancel(numberId) {
    await call("/sms/cancel", { orderid: numberId });
  },

  /** SMSPool closes a number by itself once the code is in. */
  async finish() {},

  async balance() {
    const data = await call<{ balance?: unknown }>("/request/balance");
    const n = Number(data?.balance);
    return Number.isFinite(n) ? n : null;
  },
};
