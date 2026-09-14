import type {
  SupplierProductsResponse,
  SupplierPurchaseResponse,
} from "./types";

export interface SupplierConfig {
  baseUrl: string;
  apiKey: string;
}

export async function fetchSupplierProducts(
  config: SupplierConfig
): Promise<SupplierProductsResponse> {
  const url = `${config.baseUrl}/api/products.php?api_key=${config.apiKey}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Supplier fetch failed: ${res.status}`);
  return res.json() as Promise<SupplierProductsResponse>;
}

export async function purchaseFromSupplier(
  config: SupplierConfig,
  productId: string,
  quantity: number,
  coupon?: string
): Promise<SupplierPurchaseResponse> {
  const formData = new URLSearchParams();
  formData.set("action", "buyProduct");
  formData.set("id", productId);
  formData.set("amount", String(quantity));
  formData.set("api_key", config.apiKey);
  if (coupon) formData.set("coupon", coupon);

  const url = `${config.baseUrl}/api/buy_product`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
  } catch (networkErr) {
    throw new Error(`Supplier network error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`);
  }

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(`Supplier HTTP ${res.status}: ${rawText.slice(0, 500)}`);
  }

  let parsed: SupplierPurchaseResponse;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Supplier returned non-JSON: ${rawText.slice(0, 500)}`);
  }

  return parsed;
}

/**
 * The supplier's account balance (what we have left to spend with them), read
 * from the shop-clone script's profile endpoint. Returns null if the endpoint
 * is unreachable or the response carries no recognisable balance, so callers
 * can degrade to the reactive "insufficient balance" alert instead of failing.
 * The value is in whatever unit the supplier reports; it is not converted.
 */
export async function fetchSupplierBalance(
  config: SupplierConfig
): Promise<number | null> {
  const url = `${config.baseUrl}/api/profile.php?api_key=${encodeURIComponent(config.apiKey)}`;
  let json: unknown;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }

  // Shapes vary between clones: { balance }, { data: { balance } },
  // { user: { money } } ... so look in the usual places for the usual names.
  const containers = [json, (json as any)?.data, (json as any)?.user, (json as any)?.profile];
  for (const c of containers) {
    if (!c || typeof c !== "object") continue;
    for (const key of ["balance", "money", "wallet", "credit", "amount"]) {
      const raw = (c as Record<string, unknown>)[key];
      if (raw == null) continue;
      const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
