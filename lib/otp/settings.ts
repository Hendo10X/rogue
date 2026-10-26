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

/** Customer price in ₦ for a USD cost, rounded up to the next ₦10. */
export async function otpPriceNgn(costUsd: number): Promise<number> {
  const [{ markupPercent }, rate] = await Promise.all([getOtpSettings(), getUSDtoNGNRate()]);
  return Math.ceil((costUsd * rate * (1 + markupPercent / 100)) / 10) * 10;
}

// Lists change rarely and the API allows 120 calls a minute: cache them.
let countries: { at: number; value: OtpCountry[] } | null = null;
const apps = new Map<string, { at: number; value: OtpApp[] }>();

export async function getCountries(): Promise<OtpCountry[]> {
  if (countries && Date.now() - countries.at < 6 * 60 * 60 * 1000) return countries.value;
  countries = { at: Date.now(), value: await fetchCountries() };
  return countries.value;
}

/** Prices move, so app lists are only cached for 10 minutes. */
export async function getApps(country: string): Promise<OtpApp[]> {
  const hit = apps.get(country);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.value;
  const value = await fetchApps(country);
  apps.set(country, { at: Date.now(), value });
  return value;
}
