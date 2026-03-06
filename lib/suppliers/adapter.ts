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

  const url = `${config.baseUrl}/api/order.php`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });
  if (!res.ok) throw new Error(`Supplier purchase failed: ${res.status}`);
  return res.json() as Promise<SupplierPurchaseResponse>;
}
