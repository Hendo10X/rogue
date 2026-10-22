import { getSetting, setSetting } from "@/lib/admin-auth";
import { computeMarketplacePriceNgn, roundClean, type MarketplacePricing } from "@/lib/pricing";

/**
 * Per-listing profit overrides for supplier logs, in ₦ added to the supplier's
 * cost. Listings without one use the tiered marketplace pricing. Stored in
 * settings by listing id so the supplier sync never overwrites them.
 */
const KEY = "log_profit";

export async function getLogProfits(): Promise<Map<string, number>> {
  try {
    const raw = await getSetting(KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const map = new Map<string, number>();
    for (const [id, v] of Object.entries(obj)) {
      const n = Number(v);
      if (id && Number.isFinite(n) && n >= 0) map.set(id, n);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Set (or with `null`, clear) the profit for each listing id. */
export async function setLogProfits(ids: string[], profit: number | null): Promise<Map<string, number>> {
  const map = await getLogProfits();
  for (const id of ids) {
    if (!id) continue;
    if (profit === null) map.delete(id);
    else map.set(id, Math.round(profit));
  }
  await setSetting(KEY, JSON.stringify(Object.fromEntries(map)));
  return map;
}

/**
 * The customer price (₦) for one listing — the single rule used by the store,
 * the listing page and checkout, so what's shown is what's charged:
 * - manual logs: their admin-set price;
 * - supplier logs with a profit override: supplier cost in ₦ + that profit;
 * - everything else: the tiered marketplace pricing.
 */
export function priceListingNgn(
  row: { id: string; price: string; supplierPrice: string; metadata?: unknown },
  rate: number,
  pricing: MarketplacePricing,
  profits: Map<string, number>,
): number {
  const meta = (row.metadata ?? null) as { manual?: unknown } | null;
  if (meta?.manual === true) return Math.round(parseFloat(row.price));
  const profit = profits.get(row.id);
  if (profit !== undefined) {
    const baseNgn = (parseFloat(row.supplierPrice) || 0) * rate;
    return roundClean(baseNgn + profit);
  }
  return computeMarketplacePriceNgn(parseFloat(row.supplierPrice), rate, pricing);
}
