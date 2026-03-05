import { createHmac } from "crypto";

const PLISIO_API_BASE = "https://api.plisio.net/api/v1";

export interface CreateInvoiceParams {
  orderNumber: string;
  orderName: string;
  sourceCurrency: string;
  sourceAmount: number;
  currency?: string;
  callbackUrl: string;
  successCallbackUrl?: string;
  email?: string;
}

export interface PlisioInvoiceResponse {
  status: "success" | "error";
  data?: {
    txn_id: string;
    invoice_url: string;
    invoice_total_sum?: string;
    verify_hash?: string;
    [key: string]: unknown;
  };
  error?: {
    name: string;
    message: string;
    code: number;
  };
}

export async function createPlisioInvoice(
  apiKey: string,
  params: CreateInvoiceParams
): Promise<PlisioInvoiceResponse> {
  const key = apiKey.trim();
  const searchParams = new URLSearchParams({
    api_key: key,
    order_number: params.orderNumber,
    order_name: params.orderName,
    source_currency: params.sourceCurrency,
    source_amount: params.sourceAmount.toString(),
    callback_url: params.callbackUrl,
  });
  if (params.currency) searchParams.set("currency", params.currency);
  if (params.successCallbackUrl)
    searchParams.set("success_callback_url", params.successCallbackUrl);
  if (params.email) searchParams.set("email", params.email);

  const res = await fetch(
    `${PLISIO_API_BASE}/invoices/new?${searchParams.toString()}`,
    { method: "GET" }
  );
  const json = (await res.json()) as PlisioInvoiceResponse;
  return json;
}

export function verifyPlisioWebhook(
  payload: Record<string, unknown>,
  apiKey: string
): boolean {
  const key = apiKey.trim();
  const verifyHash = payload.verify_hash;
  if (typeof verifyHash !== "string" || !key) return false;

  const { verify_hash: _vh, ...rest } = payload;
  const keys = Object.keys(rest).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) {
    ordered[k] = rest[k];
  }
  const string = JSON.stringify(ordered);

  const hmac = createHmac("sha1", key);
  hmac.update(string);
  const hash = hmac.digest("hex");
  return hash === verifyHash;
}
