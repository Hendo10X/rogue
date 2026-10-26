import type { ProxyCredential } from "@/db/schema";

/**
 * proxy-seller Client API v2 (https://proxy-seller.com/personal/api/v2/).
 * The key goes in the URL path, and almost every answer is HTTP 200 with
 * `{ status, data, errors }`, so success is read from the envelope.
 * We only sell dedicated IPv4, paid from the Rogue account balance.
 */
const BASE = "https://proxy-seller.com/personal/api/v2";
const SECTION = "ipv4";
// v2 rejects ipv4 orders without a goal; customers aren't asked for one.
const TARGET = "Social media";

export class ProxyProviderError extends Error {}

export function proxyProviderConfigured(): boolean {
  return !!process.env.PROXY_SELLER_API_KEY?.trim();
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
  const key = process.env.PROXY_SELLER_API_KEY?.trim();
  if (!key) throw new ProxyProviderError("Proxies aren't configured");
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  let res: Response;
  try {
    res = await fetch(`${BASE}/${encodeURIComponent(key)}/${path}${qs}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(method === "POST" && path === "order/make" ? 60_000 : 20_000),
    });
  } catch (err) {
    // Never echo the URL: it contains the key.
    throw new ProxyProviderError(`Proxy supplier unreachable (${err instanceof Error ? err.name : "network"})`);
  }
  const json = (await res.json().catch(() => null)) as
    | { status?: string; data?: T; errors?: { message?: string; code?: number }[] }
    | null;
  if (json?.status === "success") return json.data as T;
  const message = json?.errors?.[0]?.message || `Proxy supplier error (HTTP ${res.status})`;
  throw new ProxyProviderError(message);
}

export type ProxyOption = { id: string; name: string };

/** Countries and rental periods on sale for dedicated IPv4. */
export async function fetchCatalog(): Promise<{ countries: ProxyOption[]; periods: ProxyOption[] }> {
  const data = await call<{ items?: { country?: ProxyOption[]; period?: ProxyOption[] } }>("GET", `reference/list/${SECTION}`);
  const pick = (list: unknown): ProxyOption[] =>
    Array.isArray(list)
      ? list
          .map((o: { id?: unknown; name?: unknown }) => ({ id: String(o.id ?? ""), name: String(o.name ?? o.id ?? "") }))
          .filter((o) => o.id)
      : [];
  return { countries: pick(data?.items?.country), periods: pick(data?.items?.period) };
}

function order(country: string, period: string, quantity: number) {
  return {
    sectionCode: SECTION,
    countryId: country,
    periodId: period,
    quantity,
    customTargetName: TARGET,
    paymentCode: "balance",
  };
}

function usd(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Supplier price in USD for this order, without placing it. */
export async function quoteUsd(country: string, period: string, quantity: number): Promise<number> {
  const data = await call<Record<string, unknown>>("POST", "order/calc", order(country, period, quantity));
  const total = usd(data?.total) ?? usd(data?.summ) ?? usd(data?.price);
  if (total == null) throw new ProxyProviderError("Proxy supplier returned no price");
  return total;
}

/** Places the order on the Rogue balance. Returns the supplier order id. */
export async function placeOrder(country: string, period: string, quantity: number) {
  const data = await call<{ orderId?: string; orderIds?: string[]; total?: unknown }>("POST", "order/make", {
    ...order(country, period, quantity),
    generateAuth: "Y",
  });
  const orderId = data?.orderId ?? data?.orderIds?.[0];
  if (!orderId) throw new ProxyProviderError("Proxy supplier didn't return an order id");
  return { orderId: String(orderId), costUsd: usd(data?.total) };
}

/** Proxy rows anywhere in a proxy/list answer: `items`, a bare array, or nested per order. */
function proxyRows(data: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (v: unknown, depth: number) => {
    if (depth > 4 || v == null) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o.ip === "string" && o.ip) out.push(o);
    else Object.values(o).forEach((x) => walk(x, depth + 1));
  };
  walk(data, 0);
  return out;
}

/**
 * Credentials for one supplier order, once it's ready (empty while processing).
 * The `orderId` filter is applied by proxy-seller, which accepts any of its
 * order ids (ObjectId, numeric id, order number), so rows are not re-filtered
 * here: their `order_id` is the ObjectId and may not match the id we saved.
 */
export async function fetchOrderProxies(orderId: string): Promise<{ proxies: ProxyCredential[]; expiresAt: Date | null }> {
  const data = await call<unknown>("GET", `proxy/list/${SECTION}`, undefined, { orderId });
  const rows = proxyRows(data);
  if (rows.length === 0) {
    // Shape only (no credentials) so a stuck order can be diagnosed from the logs.
    const keys = data && typeof data === "object" ? Object.keys(data as object).join(",") : typeof data;
    console.log(`[Proxies] no proxies yet for order ${orderId} (response keys: ${keys})`);
  }
  const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const proxies = rows.map((r) => ({
    ip: String(r.ip),
    portHttp: num(r.port_http ?? r.port),
    portSocks: num(r.port_socks),
    login: String(r.login ?? ""),
    password: String(r.password ?? ""),
  }));
  const end = rows[0]?.date_end ? new Date(String(rows[0].date_end)) : null;
  return { proxies, expiresAt: end && !Number.isNaN(end.getTime()) ? end : null };
}

/** Rogue's prepaid balance at proxy-seller, in USD. */
export async function fetchProviderBalance(): Promise<number | null> {
  const data = await call<{ summ?: unknown }>("GET", "balance/get");
  return usd(data?.summ) ?? (Number(data?.summ) === 0 ? 0 : null);
}

/** The raw proxy/list answer for one order, for the admin diagnostics view. */
export async function fetchOrderRaw(orderId: string): Promise<unknown> {
  return call<unknown>("GET", `proxy/list/${SECTION}`, undefined, { orderId });
}
