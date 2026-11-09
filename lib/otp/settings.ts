import { getSetting, setSetting } from "@/lib/admin-auth";
import { getUSDtoNGNRate } from "@/lib/currency";
import { markupFor, type Channel } from "@/lib/bot-pricing";
import { activeProviders, fetchApps, fetchCountries, type OtpApp, type OtpCountry } from "./provider";

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
  // On when sales are switched on and at least one provider has a key and is switched on.
  const [{ enabled }, providers] = await Promise.all([getOtpSettings(), activeProviders()]);
  return enabled && providers.length > 0;
}

/**
 * Prices USD costs in ₦ (rounded up to the next ₦10). Reads the markup and
 * rate once, so a list of thousands of apps costs two lookups, not thousands.
 */
export async function getOtpPricer(channel: Channel = "web"): Promise<(costUsd: number) => number> {
  const [{ markupPercent: website }, rate] = await Promise.all([getOtpSettings(), getUSDtoNGNRate()]);
  // The Telegram bot can have its own markup (Admin → Telegram bot).
  const markupPercent = await markupFor("otp", channel, website);
  return (costUsd) => Math.ceil((costUsd * rate * (1 + markupPercent / 100)) / 10) * 10;
}

export async function otpPriceNgn(costUsd: number, channel: Channel = "web"): Promise<number> {
  return (await getOtpPricer(channel))(costUsd);
}

// Countries change rarely: cache them for hours.
let countries: { at: number; value: OtpCountry[] } | null = null;
const apps = new Map<string, { at: number; value: OtpApp[] }>();

export async function getCountries(): Promise<OtpCountry[]> {
  if (countries && Date.now() - countries.at < 6 * 60 * 60 * 1000) return countries.value;
  countries = { at: Date.now(), value: await fetchCountries() };
  return countries.value;
}

/** Drops a country's cached list, e.g. after an app sells out. */
export function forgetApps(country: string) {
  apps.delete(country);
}

/** Stock moves fast, so app lists are only cached for 20 seconds. */
export async function getApps(country: string): Promise<OtpApp[]> {
  const hit = apps.get(country);
  if (hit && Date.now() - hit.at < 20 * 1000) return hit.value;
  const value = await fetchApps(country);
  apps.set(country, { at: Date.now(), value });
  return value;
}
