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
