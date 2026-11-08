/** Nobody can boost fewer than this (stops tiny ₦20 orders). */
export const BOOSTING_MIN_QUANTITY = 100;

/**
 * The smallest quantity we sell for a service: the supplier's own minimum, but
 * never below 100, unless the service can't even reach 100 (its max is lower).
 */
export function boostingMin(service: { min: string | number; max: string | number }): number {
  const supplierMin = parseInt(String(service.min), 10) || 1;
  const max = parseInt(String(service.max), 10) || 10000;
  return max >= BOOSTING_MIN_QUANTITY ? Math.max(BOOSTING_MIN_QUANTITY, supplierMin) : supplierMin;
}
