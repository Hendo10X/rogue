import { getSetting } from "@/lib/admin-auth";

/**
 * Marketplace ("logs") pricing model.
 *
 * Cheap logs get a flat Naira fee added; logs whose base value is at or above
 * the threshold get a percentage markup instead. A hard price cap hides any
 * auto-synced log that would still price above it — so customers never see a
 * scary "₦500k" listing.
 *
 * All values are admin-configurable from the dashboard (Settings → Pricing).
 */
export interface MarketplacePricing {
  flatFeeNaira: number; // added to logs priced below the threshold
  thresholdNaira: number; // boundary between flat-fee and percentage tiers
  percent: number; // markup % applied to logs at/above the threshold
  priceCapNaira: number; // logs above this are hidden (0 = no cap)
}

export const MARKETPLACE_PRICING_DEFAULTS: MarketplacePricing = {
  flatFeeNaira: 1500,
  thresholdNaira: 9000,
  percent: 20,
  priceCapNaira: 500000,
};

function toNum(value: string | null, fallback: number): number {
  const n = value != null ? parseFloat(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getMarketplacePricing(): Promise<MarketplacePricing> {
  const [flat, threshold, percent, cap] = await Promise.all([
    getSetting("mp_flat_fee_naira"),
    getSetting("mp_threshold_naira"),
    getSetting("mp_percent"),
    getSetting("mp_price_cap_naira"),
  ]);
  return {
    flatFeeNaira: toNum(flat, MARKETPLACE_PRICING_DEFAULTS.flatFeeNaira),
    thresholdNaira: toNum(threshold, MARKETPLACE_PRICING_DEFAULTS.thresholdNaira),
    percent: toNum(percent, MARKETPLACE_PRICING_DEFAULTS.percent),
    priceCapNaira: toNum(cap, MARKETPLACE_PRICING_DEFAULTS.priceCapNaira),
  };
}

/** Round to a clean figure so prices look intentional rather than random. */
function roundClean(ngn: number): number {
  if (ngn <= 0) return 0;
  if (ngn < 1000) return Math.round(ngn / 50) * 50;
  return Math.round(ngn / 100) * 100;
}

/**
 * Final customer price (NGN) for an auto-synced supplier log.
 * `supplierPriceUsd` is the raw supplier cost; `rate` is USD→NGN.
 */
export function computeMarketplacePriceNgn(
  supplierPriceUsd: number,
  rate: number,
  pricing: MarketplacePricing,
): number {
  const baseNgn = (Number.isFinite(supplierPriceUsd) ? supplierPriceUsd : 0) * rate;
  const final =
    baseNgn < pricing.thresholdNaira
      ? baseNgn + pricing.flatFeeNaira
      : baseNgn * (1 + pricing.percent / 100);
  return roundClean(final);
}

export function isAboveCap(
  finalNgn: number,
  pricing: MarketplacePricing,
): boolean {
  return pricing.priceCapNaira > 0 && finalNgn > pricing.priceCapNaira;
}

/**
 * The supplier-USD price above which a percentage-tier log would exceed the
 * cap. Used to filter listings out at the SQL level. Only the percentage tier
 * can ever reach the cap, so the threshold tier is unaffected.
 * Returns null when no cap is configured.
 */
export function capSupplierUsd(
  rate: number,
  pricing: MarketplacePricing,
): number | null {
  if (pricing.priceCapNaira <= 0 || rate <= 0) return null;
  return pricing.priceCapNaira / (1 + pricing.percent / 100) / rate;
}
