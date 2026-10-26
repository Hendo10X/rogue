import type { ProxyCredential } from "@/db/schema";

/**
 * proxy-seller Client API v2 (https://proxy-seller.com/personal/api/v2/).
 * The key goes in the URL path, and almost every answer is HTTP 200 with
 * `{ status, data, errors }`, so success is read from the envelope.
 * We sell IPv4, ISP, IPv6 and mobile proxies, paid from the Rogue account balance.
 */
const BASE = "https://proxy-seller.com/personal/api/v2";
// v2 rejects ipv4/ipv6/isp orders without a goal; customers aren't asked for one.
const TARGET = "Social media";

export const PROXY_TYPES = ["ipv4", "isp", "ipv6", "mobile"] as const;
export type ProxyType = (typeof PROXY_TYPES)[number];
export const IPV6_PROTOCOLS = ["HTTPS", "SOCKS5"] as const;

export function isProxyType(v: unknown): v is ProxyType {
  return typeof v === "string" && (PROXY_TYPES as readonly string[]).includes(v);
}

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
export type MobileOperator = { id: string; name: string; rotations: { id: number; name: string }[] };
export type ProxyCatalog = {
  countries: ProxyOption[];
  periods: ProxyOption[];
  /** Mobile only: dedicated operators per country id. */
  operators?: Record<string, MobileOperator[]>;
};

/** What a customer picked; extra fields apply to one type only. */
export type ProxySpec = {
  type: ProxyType;
  country: string;
  period: string;
  quantity: number;
  /** Mobile: operator id from the catalog, and IP rotation in minutes (0 = by link). */
  operator?: string;
  rotation?: number;
  /** IPv6: which protocol the proxies speak. */
  protocol?: (typeof IPV6_PROTOCOLS)[number];
};

const pick = (list: unknown): ProxyOption[] =>
  Array.isArray(list)
    ? list
        .map((o: { id?: unknown; name?: unknown }) => ({ id: String(o.id ?? ""), name: String(o.name ?? o.id ?? "") }))
        .filter((o) => o.id)
    : [];

/** Countries, rental periods (and mobile operators) on sale for one proxy type. */
export async function fetchCatalog(type: ProxyType): Promise<ProxyCatalog> {
  const data = await call<{ items?: { country?: unknown[]; period?: unknown[] } }>("GET", `reference/list/${type}`);
  const countries = pick(data?.items?.country);
  const periods = pick(data?.items?.period);
  if (type !== "mobile") return { countries, periods };

  const operators: Record<string, MobileOperator[]> = {};
  for (const c of (data?.items?.country ?? []) as { id?: unknown; operators?: { dedicated?: unknown[] } }[]) {
    const list = (c.operators?.dedicated ?? []) as { id?: unknown; name?: unknown; rotations?: { id?: unknown; name?: unknown }[] }[];
    const ops = list
      .map((o) => ({
        id: String(o.id ?? ""),
        name: String(o.name ?? o.id ?? ""),
        rotations: (o.rotations ?? [])
          .map((r) => ({ id: Number(r.id), name: String(r.name ?? r.id) }))
          .filter((r) => Number.isFinite(r.id)),
      }))
      .filter((o) => o.id);
    if (c.id && ops.length) operators[String(c.id)] = ops;
  }
  // Only countries that have an operator can actually be bought.
  return { countries: countries.filter((c) => operators[c.id]), periods, operators };
}

function order(spec: ProxySpec) {
  const base = {
    sectionCode: spec.type,
    countryId: spec.country,
    periodId: spec.period,
    quantity: spec.quantity,
    paymentCode: "balance",
  };
  if (spec.type === "mobile") {
    return { ...base, operatorId: spec.operator, rotationId: spec.rotation ?? 0, mobileServiceType: "dedicated" };
  }
  if (spec.type === "ipv6") return { ...base, customTargetName: TARGET, protocol: spec.protocol ?? "HTTPS" };
  return { ...base, customTargetName: TARGET };
}

function usd(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Supplier price in USD for this order, without placing it. */
export async function quoteUsd(spec: ProxySpec): Promise<number> {
  const data = await call<Record<string, unknown>>("POST", "order/calc", order(spec));
  const total = usd(data?.total) ?? usd(data?.summ) ?? usd(data?.price);
  if (total == null) throw new ProxyProviderError("Proxy supplier returned no price");
  return total;
}

/** Places the order on the Rogue balance. Returns the supplier order id. */
export async function placeOrder(spec: ProxySpec) {
  const data = await call<{ orderId?: string; orderIds?: string[]; total?: unknown }>("POST", "order/make", {
    ...order(spec),
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
export async function fetchOrderProxies(orderId: string, type: ProxyType = "ipv4"): Promise<{ proxies: ProxyCredential[]; expiresAt: Date | null }> {
  const data = await call<unknown>("GET", `proxy/list/${type}`, undefined, { orderId });
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
export async function fetchOrderRaw(orderId: string, type: ProxyType = "ipv4"): Promise<unknown> {
  return call<unknown>("GET", `proxy/list/${type}`, undefined, { orderId });
}
