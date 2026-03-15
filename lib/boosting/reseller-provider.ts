const API_BASE = "https://resellerprovider.ru/api/v2";

export interface ResellerProviderService {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
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
  const key = process.env.RESELLER_PROVIDER_API_KEY?.trim();
  if (!key) {
    throw new Error("RESELLER_PROVIDER_API_KEY is not set. Add it to .env");
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
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchServices(): Promise<ResellerProviderService[]> {
  const data = await post({ action: "services" });
  if (!Array.isArray(data)) throw new Error("Invalid services response");
  return data as ResellerProviderService[];
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
    const maybeError = raw as { error?: unknown };
    const msg =
      typeof maybeError.error === "string"
        ? maybeError.error
        : "Invalid add order response";
    throw new Error(msg);
  }
  const data = raw as AddOrderResponse;
  return data;
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
