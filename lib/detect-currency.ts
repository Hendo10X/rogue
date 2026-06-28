import { cookies, headers } from "next/headers";
import {
  getRates,
  buildSupportedRateMap,
  currencyForCountry,
  isSupportedCurrency,
} from "./currency";

export const CURRENCY_COOKIE = "rogue_currency";

/**
 * Resolve the display currency for the current request:
 *  1. explicit user preference (cookie), else
 *  2. country inferred from the edge IP header, else
 *  3. NGN (home market).
 * Also returns the compact rate map the client needs to convert prices.
 */
export async function resolveCurrency(): Promise<{
  currency: string;
  rates: Record<string, number>;
}> {
  const [cookieStore, headerStore, rates] = await Promise.all([
    cookies(),
    headers(),
    getRates(),
  ]);
  const supported = buildSupportedRateMap(rates);

  const pref = cookieStore.get(CURRENCY_COOKIE)?.value;
  if (pref && isSupportedCurrency(pref)) {
    return { currency: pref.toUpperCase(), rates: supported };
  }

  const country =
    headerStore.get("x-vercel-ip-country") ??
    headerStore.get("cf-ipcountry") ??
    headerStore.get("x-country-code") ??
    null;

  let currency = currencyForCountry(country);
  if (!supported[currency]) currency = supported.NGN ? "NGN" : "USD";
  return { currency, rates: supported };
}
