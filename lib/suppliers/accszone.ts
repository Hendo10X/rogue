/**
 * AccsZone (https://accszone.com/api-docs). Unlike the shop-clone suppliers it
 * has a JSON REST API: key in `X-API-Key`, prices in USD as strings,
 * 20 listings per page, and catalogue calls limited to 30 a minute.
 *
 * Only the categories the client chose are copied (FILTERS below).
 */
import type { SupplierProduct, SupplierPurchaseResponse } from "./types";

export const ACCSZONE_API = "https://accszone.com/api/v1";

export function isAccszone(baseUrl: string | null | undefined): boolean {
  return (baseUrl ?? "").includes("accszone.com");
}

/** What to copy: a category or subcategory, and the platform it goes under. */
const FILTERS: { query: string; category: string; platform?: string }[] = [
  { query: "category_id=22", category: "Facebook" }, // platform worked out from the title
  { query: "subcategory_id=75", category: "Instagram Followers", platform: "instagram" },
  { query: "subcategory_id=31", category: "Aged Gmail USA", platform: "gmail" },
  { query: "subcategory_id=175", category: "Aged Gmail Mixed", platform: "gmail" },
  { query: "category_id=26", category: "Google Voice", platform: "google voice" },
  { query: "category_id=67", category: "WhatsApp", platform: "whatsapp" },
  { query: "subcategory_id=121", category: "Aged LinkedIn", platform: "linkedin" },
  { query: "subcategory_id=60", category: "TikTok Followers", platform: "tiktok" },
  { query: "category_id=33", category: "Reddit", platform: "reddit" },
  { query: "subcategory_id=123", category: "Monetized YouTube", platform: "youtube" },
  { query: "subcategory_id=163", category: "YouTube With Views", platform: "youtube" },
  // Every dating app goes under one platform.
  { query: "category_id=48", category: "Dating Apps", platform: "dating apps" },
  { query: "category_id=36", category: "Dating Apps", platform: "dating apps" },
  { query: "category_id=88", category: "Dating Apps", platform: "dating apps" },
  { query: "category_id=42", category: "Dating Apps", platform: "dating apps" },
];

// These two Facebook subcategories get their own platform on the marketplace.
const FACEBOOK_SUBCATEGORY_PLATFORMS: Record<number, string> = {
  195: "facebook with page",
  105: "facebook with followers",
};

type AzListing = { id: number; title: string; price: string; available_stock: number; description?: string | null; subcategory?: { id?: number } | null };
type AzPage = { success?: boolean; data?: AzListing[]; meta?: { current_page: number; last_page: number }; error_code?: string; message?: string };

const ENTITIES: Record<string, string> = {
  nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…", bull: "•", check: "✓", copy: "©", reg: "®", trade: "™",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/&amp;/gi, "&");
}

/** AccsZone descriptions are HTML: turn them into plain, readable lines. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<br\s*\/?>|<\/(li|tr|div)>/gi, "\n")
    .replace(/<\/(p|h[1-6]|ul|ol|table)>/gi, "\n\n")
    .replace(/<\/t[dh]>/gi, "  ")
    .replace(/<\/?[a-z!][^>]*>/gi, "");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Customers must never see where a log comes from. */
function scrub(text: string): string {
  return text.replace(/https?:\/\/\S*accs\s*zone\S*/gi, "").replace(/accs\s*zone(\.com)?/gi, "Rogue Socials");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call<T>(apiKey: string, path: string, init?: RequestInit): Promise<{ status: number; body: T; retryAfter: number }> {
  const res = await fetch(`${ACCSZONE_API}${path}`, {
    ...init,
    headers: { "X-API-Key": apiKey, Accept: "application/json", "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body, retryAfter: Number(res.headers.get("retry-after")) || 0 };
}

/**
 * Every in-stock listing in the chosen categories. Pages are read most-stock
 * first and stop at the first sold-out row, and requests are spaced ~2s apart
 * to stay under the 30-a-minute limit, so a full read takes a minute or two.
 */
export async function fetchAccszoneProducts(apiKey: string): Promise<SupplierProduct[]> {
  const out = new Map<string, SupplierProduct>();
  for (const f of FILTERS) {
    for (let page = 1; page <= 40; page++) {
      const path = `/listings?${f.query}&sort=available_stock&direction=desc&include=description&page=${page}`;
      let r = await call<AzPage>(apiKey, path);
      if (r.status === 429) {
        await sleep(Math.max(5, r.retryAfter) * 1000);
        r = await call<AzPage>(apiKey, path);
      }
      if (r.status === 401 || r.status === 403) throw new Error("AccsZone rejected the API key");
      if (r.status >= 400 || !r.body.success) throw new Error(`AccsZone listings failed (${r.body.error_code ?? r.status})`);
      const rows = r.body.data ?? [];
      let soldOut = false;
      for (const l of rows) {
        if (!(l.available_stock > 0)) {
          soldOut = true;
          break;
        }
        out.set(String(l.id), {
          id: String(l.id),
          name: scrub(decodeEntities(l.title)),
          price: l.price,
          amount: l.available_stock,
          description: scrub(htmlToText(l.description ?? "")),
          min: "1",
          max: String(l.available_stock),
          categoryId: f.query,
          categoryName: f.category,
          platform: FACEBOOK_SUBCATEGORY_PLATFORMS[l.subcategory?.id ?? 0] ?? f.platform,
        });
      }
      await sleep(2100);
      const meta = r.body.meta;
      if (soldOut || !rows.length || !meta || meta.current_page >= meta.last_page) break;
    }
  }
  return [...out.values()];
}

/** Buys accounts; the reply is shaped like the shop-clone suppliers' so checkout is unchanged. */
export async function purchaseAccszone(apiKey: string, adId: string, quantity: number, coupon?: string): Promise<SupplierPurchaseResponse> {
  const r = await call<{
    success?: boolean;
    data?: { order_id?: number | string; accounts?: string[] };
    error_code?: string;
    message?: string;
  }>(apiKey, "/purchase", {
    method: "POST",
    body: JSON.stringify({
      ad_id: Number(adId),
      quantity,
      client_reference: crypto.randomUUID(),
      ...(coupon ? { promo_code: coupon } : {}),
    }),
  });
  if (!r.body.success || !r.body.data?.order_id) {
    // e.g. "insufficient_balance: …" so the balance alert still recognises it.
    return { status: "error", msg: `${r.body.error_code ?? `HTTP ${r.status}`}: ${r.body.message ?? "purchase failed"}` };
  }
  return { status: "success", trans_id: String(r.body.data.order_id), data: r.body.data.accounts ?? [] };
}

export async function fetchAccszoneBalance(apiKey: string): Promise<number | null> {
  const r = await call<{ data?: { balance?: string } }>(apiKey, "/user/balance").catch(() => null);
  const n = Number(r?.body.data?.balance);
  return Number.isFinite(n) ? n : null;
}
