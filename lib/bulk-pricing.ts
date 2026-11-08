import { getSetting, setSetting } from "@/lib/admin-auth";

/**
 * Bulk discount on logs: buy at least `minQty` pieces and every piece is
 * `percent`% cheaper. Set in Admin → Settings → Bulk pricing. The same rule is
 * used for the prices customers see and for what checkout charges.
 */
export type BulkPricing = { enabled: boolean; minQty: number; percent: number };

export const BULK_DEFAULTS: BulkPricing = { enabled: false, minQty: 10, percent: 10 };

export async function getBulkPricing(): Promise<BulkPricing> {
  const [enabled, minQty, percent] = await Promise.all([
    getSetting("bulk_enabled"),
    getSetting("bulk_min_qty"),
    getSetting("bulk_percent"),
  ]);
  const qty = parseInt(minQty ?? "", 10);
  const pct = parseFloat(percent ?? "");
  return {
    enabled: enabled === "true",
    minQty: Number.isFinite(qty) && qty >= 2 ? qty : BULK_DEFAULTS.minQty,
    percent: Number.isFinite(pct) && pct > 0 && pct < 100 ? pct : BULK_DEFAULTS.percent,
  };
}

export async function setBulkPricing(next: BulkPricing): Promise<void> {
  await Promise.all([
    setSetting("bulk_enabled", String(next.enabled)),
    setSetting("bulk_min_qty", String(next.minQty)),
    setSetting("bulk_percent", String(next.percent)),
  ]);
}

/** The bulk price of one piece (₦, whole naira). */
export function bulkUnitPrice(unitNgn: number, cfg: BulkPricing): number {
  return Math.round(unitNgn * (1 - cfg.percent / 100));
}

/** What one piece costs at this quantity: the bulk price once the quantity qualifies. */
export function unitPriceForQuantity(unitNgn: number, quantity: number, cfg: BulkPricing): number {
  return cfg.enabled && quantity >= cfg.minQty ? bulkUnitPrice(unitNgn, cfg) : unitNgn;
}
