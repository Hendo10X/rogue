import { getSetting, setSetting } from "@/lib/admin-auth";
import { getUSDtoNGNRate } from "@/lib/currency";
import { fetchApps, fetchCountries, otpProviderConfigured, type OtpApp, type OtpCountry } from "./provider";

const ENABLED_KEY = "otp_enabled";
const MARKUP_KEY = "otp_markup_percent";
const DEFAULT_MARKUP = 50;

export type OtpSettings = { enabled: boolean; markupPercent: number };

/** Off until an admin turns it on, so nothing is sold before it's checked. */
export async function getOtpSettings(): Promise<OtpSettings> {
  const [enabled, markup] = await Promise.all([getSetting(ENABLED_KEY), getSetting(MARKUP_KEY)]);
  const m = Number(markup);
  return { enabled: enabled === "true", markupPercent: Number.isFinite(m) && m >= 0 ? m : DEFAULT_MARKUP };
}

export async function setOtpSettings(value: Partial<OtpSettings>) {
  if (value.enabled !== undefined) await setSetting(ENABLED_KEY, value.enabled ? "true" : "false");
  if (value.markupPercent !== undefined) await setSetting(MARKUP_KEY, String(value.markupPercent));
}

export async function otpOnSale(): Promise<boolean> {
  return otpProviderConfigured() && (await getOtpSettings()).enabled;
}

/**
 * Prices USD costs in ₦ (rounded up to the next ₦10). Reads the markup and
 * rate once, so a list of thousands of apps costs two lookups, not thousands.
 */
export async function getOtpPricer(): Promise<(costUsd: number) => number> {
  const [{ markupPercent }, rate] = await Promise.all([getOtpSettings(), getUSDtoNGNRate()]);
  return (costUsd) => Math.ceil((costUsd * rate * (1 + markupPercent / 100)) / 10) * 10;
}

export async function otpPriceNgn(costUsd: number): Promise<number> {
  return (await getOtpPricer())(costUsd);
}

// Countries change rarely: cache them for hours.
let countries: { at: number; value: OtpCountry[] } | null = null;
const apps = new Map<string, { at: number; value: OtpApp[] }>();

export async function getCountries(): Promise<OtpCountry[]> {
  if (countries && Date.now() - countries.at < 6 * 60 * 60 * 1000) return countries.value;
  countries = { at: Date.now(), value: await fetchCountries() };
  return countries.value;
}

/** Stock and prices move, so app lists are only cached for 2 minutes. */
export async function getApps(country: string): Promise<OtpApp[]> {
  const hit = apps.get(country);
  if (hit && Date.now() - hit.at < 2 * 60 * 1000) return hit.value;
  const value = await fetchApps(country);
  apps.set(country, { at: Date.now(), value });
  return value;
}
