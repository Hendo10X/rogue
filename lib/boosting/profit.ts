import { getMarkupNaira, getSetting, setSetting } from "@/lib/admin-auth";
import { ACTIVE_SUPPLIER } from "@/lib/boosting/provider";

/**
 * Per-service profit overrides for boosting, in ₦ per 1,000 added to the
 * supplier's rate. Services without an override use the global boosting
 * markup. Keyed per supplier, like the hidden list, since service IDs are only
 * meaningful for one supplier.
 */
const KEY = `boosting_profit_${ACTIVE_SUPPLIER}`;

export async function getServiceProfits(): Promise<Map<number, number>> {
  try {
    const raw = await getSetting(KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const map = new Map<number, number>();
    for (const [k, v] of Object.entries(obj)) {
      const id = Number(k);
      const profit = Number(v);
      if (Number.isFinite(id) && Number.isFinite(profit) && profit >= 0) map.set(id, profit);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Set (or with `null`, clear) the profit for each service id. */
export async function setServiceProfits(ids: number[], profit: number | null): Promise<Map<number, number>> {
  const map = await getServiceProfits();
  for (const id of ids) {
    if (!Number.isFinite(id)) continue;
    if (profit === null) map.delete(id);
    else map.set(id, Math.round(profit * 100) / 100);
  }
  await setSetting(KEY, JSON.stringify(Object.fromEntries(map)));
  return map;
}

/**
 * Everything needed to price boosting services for the storefront: returns a
 * function giving the selling rate (₦ per 1,000) for a service.
 */
export async function getBoostingPricer() {
  const [globalMarkup, profits] = await Promise.all([getMarkupNaira("boosting"), getServiceProfits()]);
  return {
    globalMarkup,
    profits,
    profitFor: (serviceId: number) => profits.get(serviceId) ?? globalMarkup,
    sellRate: (serviceId: number, supplierRate: string | number) =>
      Number(((parseFloat(String(supplierRate)) || 0) + (profits.get(serviceId) ?? globalMarkup)).toFixed(2)),
  };
}
