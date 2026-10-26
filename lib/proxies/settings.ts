import { getSetting, setSetting } from "@/lib/admin-auth";
import { getUSDtoNGNRate } from "@/lib/currency";
import { roundClean } from "@/lib/pricing";
import { fetchCatalog, proxyProviderConfigured, type ProxyCatalog, type ProxyType } from "./provider";

const ENABLED_KEY = "proxies_enabled";
const MARKUP_KEY = "proxies_markup_percent";
const DEFAULT_MARKUP = 30;
export const MAX_PROXIES_PER_ORDER = 20;

export type ProxySettings = { enabled: boolean; markupPercent: number };

/** Off until an admin turns it on, so nothing is sold before it's checked. */
export async function getProxySettings(): Promise<ProxySettings> {
  const [enabled, markup] = await Promise.all([getSetting(ENABLED_KEY), getSetting(MARKUP_KEY)]);
  const m = Number(markup);
  return { enabled: enabled === "true", markupPercent: Number.isFinite(m) && m >= 0 ? m : DEFAULT_MARKUP };
}

export async function setProxySettings(value: Partial<ProxySettings>) {
  if (value.enabled !== undefined) await setSetting(ENABLED_KEY, value.enabled ? "true" : "false");
  if (value.markupPercent !== undefined) await setSetting(MARKUP_KEY, String(value.markupPercent));
}

/** Proxies are on sale: switched on by an admin and the API key is set. */
export async function proxiesOnSale(): Promise<boolean> {
  return proxyProviderConfigured() && (await getProxySettings()).enabled;
}

/** Customer price in ₦ for a supplier price in USD. */
export async function priceNgn(costUsd: number): Promise<number> {
  const [{ markupPercent }, rate] = await Promise.all([getProxySettings(), getUSDtoNGNRate()]);
  return roundClean(costUsd * rate * (1 + markupPercent / 100));
}

// The catalog changes rarely; cache it per type and server instance for an hour.
const catalogs = new Map<ProxyType, { at: number; value: ProxyCatalog }>();
export async function getCatalog(type: ProxyType): Promise<ProxyCatalog> {
  const hit = catalogs.get(type);
  if (hit && Date.now() - hit.at < 60 * 60 * 1000) return hit.value;
  const value = await fetchCatalog(type);
  catalogs.set(type, { at: Date.now(), value });
  return value;
}
