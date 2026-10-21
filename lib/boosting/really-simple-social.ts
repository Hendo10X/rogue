const API_BASE = "https://reallysimplesocial.com/api/v2";

// Simple in-memory cache to avoid re-fetching all services on every order
let servicesCache: { data: ReallySimpleSocialService[]; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ReallySimpleSocialService {
  service: number;
  name: string;
  type: string;
  category: string;
  /** NGN per 1,000. */
  rate: string;
  // The API sends min/max as numbers; they're normalised to strings in
  // fetchServices so existing parseInt callers keep working.
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
  dripfeed?: boolean;
}

export interface AddOrderResponse {
  order: number;
}

export interface OrderStatusResponse {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

export interface BalanceResponse {
  balance: string;
  currency: string;
}

function getApiKey(): string {
  const key = process.env.REALLYSIMPLESOCIAL_API_KEY?.trim();
  if (!key) {
    throw new Error("REALLYSIMPLESOCIAL_API_KEY is not set. Add it to .env");
  }
  return key;
}

async function post(params: Record<string, string>): Promise<unknown> {
  const body = new URLSearchParams({ key: getApiKey(), ...params });
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ReallySimpleSocial API error ${res.status}: ${text}`);
  }
  const json = await res.json().catch(() => null);
  if (json === null) throw new Error("ReallySimpleSocial returned non-JSON response");
  // Surface API-level errors (e.g. { "error": "..." })
  if (typeof json === "object" && json !== null && "error" in json) {
    throw new Error(`ReallySimpleSocial: ${(json as { error: string }).error}`);
  }
  return json;
}

export async function fetchServices(): Promise<ReallySimpleSocialService[]> {
  if (servicesCache && Date.now() - servicesCache.ts < CACHE_TTL_MS) {
    return servicesCache.data;
  }
  const data = await post({ action: "services" });
  if (!Array.isArray(data)) throw new Error("Invalid services response");
  const services = (data as Record<string, unknown>[]).map((s) => ({
    ...s,
    service: Number(s.service),
    rate: String(s.rate),
    min: String(s.min),
    max: String(s.max),
  })) as ReallySimpleSocialService[];
  servicesCache = { data: services, ts: Date.now() };
  return services;
}

export async function addOrder(params: {
  service: number;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
}): Promise<AddOrderResponse> {
  const body: Record<string, string> = {
    action: "add",
    service: String(params.service),
    link: params.link,
    quantity: String(params.quantity),
  };
  if (params.runs != null) body.runs = String(params.runs);
  if (params.interval != null) body.interval = String(params.interval);
  const raw = (await post(body)) as unknown;
  if (typeof raw !== "object" || raw === null || !("order" in raw)) {
    throw new Error(`Unexpected response from ReallySimpleSocial: ${JSON.stringify(raw)}`);
  }
  const orderId = Number((raw as AddOrderResponse).order);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error(
      `ReallySimpleSocial rejected the order (order=${(raw as AddOrderResponse).order}). Check the link and try again.`
    );
  }
  return { order: orderId };
}

export async function getOrderStatus(
  orderId: number,
): Promise<OrderStatusResponse> {
  const data = await post({ action: "status", order: String(orderId) });
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid status response");
  }
  return data as OrderStatusResponse;
}

export async function getBalance(): Promise<BalanceResponse> {
  const data = await post({ action: "balance" });
  if (
    typeof data !== "object" ||
    data === null ||
    !("balance" in data) ||
    !("currency" in data)
  ) {
    throw new Error("Invalid balance response");
  }
  return data as BalanceResponse;
}
