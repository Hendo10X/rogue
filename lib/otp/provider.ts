/**
 * 5sim.net API v1 (https://5sim.net/v1). Lists are public ("guest"); buying
 * and checking need `Authorization: Bearer <FIVESIM_API_KEY>`. Prices are in
 * USD. Product lists carry a stock count (Qty), so empty apps are never offered.
 * Errors come back as short plain-text bodies such as "no free phones".
 */
import { appLabel } from "./labels";

const BASE = "https://5sim.net/v1";
/** Let 5sim pick whichever operator has a number. */
const OPERATOR = "any";

export class OtpProviderError extends Error {}

export function otpProviderConfigured(): boolean {
  return !!process.env.FIVESIM_API_KEY?.trim();
}

async function call<T>(path: string, { auth = true, params }: { auth?: boolean; params?: Record<string, string> } = {}): Promise<T> {
  const key = process.env.FIVESIM_API_KEY?.trim();
  if (auth && !key) throw new OtpProviderError("OTP numbers aren't configured");
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}${qs}`, {
      headers: { Accept: "application/json", ...(auth ? { Authorization: `Bearer ${key}` } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    throw new OtpProviderError(`OTP supplier unreachable (${err instanceof Error ? err.name : "network"})`);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 5sim answers errors as plain text.
  }
  if (!res.ok || json === null) throw new OtpProviderError(text.trim().slice(0, 200) || `OTP supplier error (HTTP ${res.status})`);
  return json as T;
}

export type OtpCountry = { id: string; name: string };
export type OtpApp = { name: string; label: string; priceUsd: number; stock: number };

/** Countries by 5sim slug (e.g. "usa") with their English name. */
export async function fetchCountries(): Promise<OtpCountry[]> {
  const data = await call<Record<string, { text_en?: string }>>("guest/countries", { auth: false });
  return Object.entries(data ?? {})
    .map(([id, c]) => ({ id, name: c?.text_en?.trim() || id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type OperatorPrices = Record<string, { cost?: number; count?: number }>;

/**
 * The cheapest operator that actually has numbers. 5sim's product summary
 * pairs the cheapest price of ANY operator with the stock of all of them, so
 * an app could show $0.97 while only a $3.50 operator had numbers, and every
 * purchase capped at $0.97 failed. Pricing from in-stock operators avoids that.
 */
function inStock(ops: OperatorPrices | undefined): { priceUsd: number; stock: number } | null {
  let priceUsd = Infinity;
  let stock = 0;
  for (const o of Object.values(ops ?? {})) {
    const cost = Number(o?.cost);
    const count = Number(o?.count);
    if (!(count > 0) || !(cost > 0)) continue;
    stock += count;
    priceUsd = Math.min(priceUsd, cost);
  }
  return stock > 0 ? { priceUsd, stock } : null;
}

/** Apps with numbers in stock for one country, priced at the cheapest in-stock operator (USD). */
export async function fetchApps(country: string): Promise<OtpApp[]> {
  const [products, prices] = await Promise.all([
    call<Record<string, { Category?: string }>>(`guest/products/${encodeURIComponent(country)}/${OPERATOR}`, { auth: false }),
    call<Record<string, Record<string, OperatorPrices>>>("guest/prices", { auth: false, params: { country } }),
  ]);
  const byApp = prices?.[country] ?? {};
  return Object.entries(products ?? {})
    .filter(([, p]) => p?.Category === "activation")
    .flatMap(([name]) => {
      const s = inStock(byApp[name]);
      return s ? [{ name, label: appLabel(name), ...s }] : [];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Live (uncached) stock and price for one app in one country, or null when sold out. */
export async function fetchAppLive(country: string, app: string): Promise<{ priceUsd: number; stock: number } | null> {
  const data = await call<Record<string, Record<string, OperatorPrices>>>("guest/prices", {
    auth: false,
    params: { country, product: app },
  });
  return inStock(data?.[country]?.[app]);
}

export async function fetchOtpBalance(): Promise<number | null> {
  const data = await call<{ balance?: unknown }>("user/profile");
  const n = Number(data?.balance);
  return Number.isFinite(n) ? n : null;
}

/**
 * Buys a number (charges the Rogue 5sim balance). `maxPriceUsd` stops 5sim
 * from picking a dearer operator than the price the customer was charged.
 */
export async function buyNumber(country: string, app: string, maxPriceUsd?: number) {
  const data = await call<{ id?: unknown; phone?: unknown; price?: unknown }>(
    `user/buy/activation/${encodeURIComponent(country)}/${OPERATOR}/${encodeURIComponent(app)}`,
    maxPriceUsd ? { params: { maxPrice: String(maxPriceUsd) } } : {},
  );
  if (!data?.id || !data?.phone) {
    console.error("[OTP] unexpected 5sim buy answer", JSON.stringify(data).slice(0, 300));
    throw new OtpProviderError("OTP supplier returned no number");
  }
  return { numberId: String(data.id), number: String(data.phone), priceUsd: Number(data.price) || null };
}

export type OtpCheck = {
  /** PENDING | RECEIVED | FINISHED | CANCELED | TIMEOUT | BANNED */
  status: string;
  code: string | null;
  sms: string | null;
};

/** The current state of a bought number, with its latest SMS if any. */
export async function checkNumber(numberId: string): Promise<OtpCheck> {
  const data = await call<{ status?: string; sms?: { text?: string; code?: string }[] }>(`user/check/${encodeURIComponent(numberId)}`);
  const last = Array.isArray(data?.sms) && data.sms.length ? data.sms[data.sms.length - 1] : null;
  const text = last?.text?.trim() || null;
  const code = last?.code?.trim() || text?.match(/\b\d{4,8}\b/)?.[0] || null;
  return { status: String(data?.status ?? "PENDING").toUpperCase(), code, sms: text };
}

/** Cancels a number that hasn't received an SMS (5sim refunds our balance). */
export async function cancelNumber(numberId: string): Promise<void> {
  await call<unknown>(`user/cancel/${encodeURIComponent(numberId)}`);
}

/** Closes a number once its code has arrived. Best effort: 5sim closes it on its own later. */
export async function finishNumber(numberId: string): Promise<void> {
  await call<unknown>(`user/finish/${encodeURIComponent(numberId)}`).catch(() => {});
}
