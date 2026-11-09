import { getSetting, setSetting } from "@/lib/admin-auth";

/**
 * Bulk discount on logs: buy at least `minQty` pieces and every piece is a
 * flat `amountOff` ₦ cheaper. Flat, not a percentage, because cheap logs are
 * priced as supplier cost + a flat fee: a percentage gave them almost nothing.
 *
 * A log only gets the bulk price while it stays above what it costs us, so a
 * big discount can never sell a cheap log at a loss; those just keep their
 * normal price. The same rule is used for the prices customers see (website,
 * Telegram bot) and for what checkout charges. Set in Admin → Settings.
 */
export type BulkPricing = { enabled: boolean; minQty: number; amountOff: number };

export const BULK_DEFAULTS: BulkPricing = { enabled: false, minQty: 10, amountOff: 100 };

export async function getBulkPricing(): Promise<BulkPricing> {
  const [enabled, minQty, amountOff] = await Promise.all([
    getSetting("bulk_enabled"),
    getSetting("bulk_min_qty"),
    getSetting("bulk_amount_off"),
  ]);
  const qty = parseInt(minQty ?? "", 10);
  const off = Math.round(parseFloat(amountOff ?? ""));
  return {
    enabled: enabled === "true",
    minQty: Number.isFinite(qty) && qty >= 2 ? qty : BULK_DEFAULTS.minQty,
    amountOff: Number.isFinite(off) && off > 0 ? off : BULK_DEFAULTS.amountOff,
  };
}

export async function setBulkPricing(next: BulkPricing): Promise<void> {
  await Promise.all([
    setSetting("bulk_enabled", String(next.enabled)),
    setSetting("bulk_min_qty", String(next.minQty)),
    setSetting("bulk_amount_off", String(next.amountOff)),
  ]);
}

/** What one piece costs us in ₦: the supplier price; 0 for our own uploaded (manual) logs. */
export function listingCostNgn(row: { supplierPrice: string; metadata?: unknown }, rate: number): number {
  const meta = (row.metadata ?? null) as { manual?: unknown } | null;
  if (meta?.manual === true) return 0;
  return (parseFloat(row.supplierPrice) || 0) * rate;
}

/** The bulk price of one piece (whole ₦), or null when bulk pricing is off or it would reach cost. */
export function bulkUnitPrice(unitNgn: number, costNgn: number, cfg: BulkPricing): number | null {
  if (!cfg.enabled) return null;
  const price = Math.round(unitNgn - cfg.amountOff);
  return price > Math.max(0, costNgn) ? price : null;
}

/** What one piece costs the customer at this quantity: the bulk price once the quantity qualifies. */
export function unitPriceForQuantity(unitNgn: number, costNgn: number, quantity: number, cfg: BulkPricing): number {
  const bulk = quantity >= cfg.minQty ? bulkUnitPrice(unitNgn, costNgn, cfg) : null;
  return bulk ?? unitNgn;
}
