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
export interface SupplierBalanceResult {
  balance: number | null;
  /**
   * When the balance couldn't be parsed: the shape of what came back (status
   * and top-level/nested key names, never values) so the parser can be taught
   * the field name without exposing account details.
   */
  shape?: string;
}

// Field names seen across shop-clone scripts (several are Vietnamese builds).
const BALANCE_KEYS = [
  "balance", "money", "wallet", "credit", "amount", "funds",
  "so_du", "sodu", "tien", "so_tien", "tien_con_lai", "coin", "xu",
];

export async function fetchSupplierBalance(
  config: SupplierConfig
): Promise<SupplierBalanceResult> {
  const url = `${config.baseUrl}/api/profile.php?api_key=${encodeURIComponent(config.apiKey)}`;
  let status = 0;
  let json: unknown;
  let lastErr = "";
  // Some suppliers (AcctShop) intermittently refuse connections, especially
  // right after another request. Retry a couple of times with a short pause
  // rather than reporting "unknown" on a single blip.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      status = res.status;
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch {
        return { balance: null, shape: `HTTP ${status}, non-JSON: ${text.slice(0, 60)}` };
      }
      if (!res.ok) return { balance: null, shape: `HTTP ${status}: ${JSON.stringify(json).slice(0, 120)}` };
      lastErr = "";
      break;
    } catch (e) {
      // Surface the underlying network cause (e.g. UND_ERR_CONNECT_TIMEOUT),
      // not just undici's generic "fetch failed".
      const cause = (e as { cause?: { code?: string; message?: string } })?.cause;
      lastErr = cause?.code
        ? `${cause.code}${cause.message ? ` (${cause.message})` : ""}`
        : e instanceof Error ? e.message : String(e);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  if (lastErr) return { balance: null, shape: `unreachable after 3 tries: ${lastErr.slice(0, 140)}` };

  // Shapes vary between clones: { balance }, { data: { balance } },
  // { user: { money } }, { so_du } ... so look in the usual places for the
  // usual names, matching keys case-insensitively.
  const root = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  const containers: unknown[] = [root, root?.data, root?.user, root?.profile, root?.info];
  for (const c of containers) {
    if (!c || typeof c !== "object" || Array.isArray(c)) continue;
    const rec = c as Record<string, unknown>;
    const lower = new Map(Object.keys(rec).map((k) => [k.toLowerCase(), k]));
    for (const key of BALANCE_KEYS) {
      const actual = lower.get(key);
      if (!actual) continue;
      const raw = rec[actual];
      if (raw == null) continue;
      const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(n)) return { balance: n };
    }
  }

  // Not found: describe the shape (keys only) so we can teach the parser.
  const describe = (v: unknown): string =>
    v && typeof v === "object" && !Array.isArray(v)
      ? `{${Object.keys(v as object).join(",")}}`
      : Array.isArray(v) ? `[${v.length}]` : typeof v;
  const nested = ["data", "user", "profile", "info"]
    .filter((k) => root && root[k] != null)
    .map((k) => `${k}=${describe(root![k])}`)
    .join(" ");
  return { balance: null, shape: `HTTP ${status} ${describe(root)} ${nested}`.trim() };
}
