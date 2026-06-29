
let cachedRate: number | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Full USD-based rate map (rates[CUR] = how many CUR per 1 USD).
let cachedRates: Record<string, number> | null = null;
let lastRatesFetch = 0;

export async function getUSDtoNGNRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && (now - lastFetch < CACHE_DURATION)) {
    return cachedRate;
  }

  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      next: { revalidate: 3600 } // Next.js fetch cache if applicable
    });
    if (!res.ok) throw new Error("Failed to fetch exchange rate");
    const data = await res.json();
    const rate = data.rates?.NGN;
    if (typeof rate !== "number") throw new Error("Invalid rate data");

    cachedRate = rate;
    lastFetch = now;
    // Opportunistically cache the whole map too.
    if (data.rates && typeof data.rates === "object") {
      cachedRates = data.rates as Record<string, number>;
      lastRatesFetch = now;
    }
    return rate;
  } catch (error) {
    console.error("Error fetching USD to NGN rate:", error);
    // Fallback to a sensible default if API fails
    const fallback = (cachedRate ?? Number(process.env.NEXT_PUBLIC_USD_TO_NGN)) || 1600;
    cachedRate = fallback; // Ensure cachedRate is at least the fallback for sync usage
    return fallback;
  }
}

export function getCachedRate(): number {
  return cachedRate || Number(process.env.NEXT_PUBLIC_USD_TO_NGN) || 1600;
}

// --- Multi-currency support (display / international ads) ----------------------

export interface CurrencyMeta {
  code: string;
  symbol: string;
  locale: string;
  /** Decimal places to show. NGN displays whole Naira. */
  decimals: number;
}

// Currencies we render natively. Everything else falls back to USD.
export const SUPPORTED_CURRENCIES: Record<string, CurrencyMeta> = {
  NGN: { code: "NGN", symbol: "₦", locale: "en-NG", decimals: 0 },
  USD: { code: "USD", symbol: "$", locale: "en-US", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", locale: "en-IE", decimals: 2 },
  CAD: { code: "CAD", symbol: "CA$", locale: "en-CA", decimals: 2 },
  GHS: { code: "GHS", symbol: "GH₵", locale: "en-GH", decimals: 2 },
  KES: { code: "KES", symbol: "KSh", locale: "en-KE", decimals: 2 },
  ZAR: { code: "ZAR", symbol: "R", locale: "en-ZA", decimals: 2 },
  INR: { code: "INR", symbol: "₹", locale: "en-IN", decimals: 2 },
  GHC: { code: "GHS", symbol: "GH₵", locale: "en-GH", decimals: 2 },
};

// ISO country (from IP) → preferred currency. Unlisted countries fall back to USD.
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  NG: "NGN",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  IN: "INR",
  IE: "EUR", FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  PT: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
};

export function currencyForCountry(country: string | null | undefined): string {
  if (!country) return "NGN";
  const c = COUNTRY_TO_CURRENCY[country.toUpperCase()];
  return c ?? "USD";
}

export function isSupportedCurrency(code: string): boolean {
  return !!SUPPORTED_CURRENCIES[code?.toUpperCase()];
}

export function getCurrencyMeta(code: string): CurrencyMeta {
  return SUPPORTED_CURRENCIES[code?.toUpperCase()] ?? SUPPORTED_CURRENCIES.USD;
}

/** Fetch & cache the full USD-based rate map. */
export async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - lastRatesFetch < CACHE_DURATION) {
    return cachedRates;
  }
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Failed to fetch rates");
    const data = await res.json();
    if (!data.rates || typeof data.rates !== "object") {
      throw new Error("Invalid rates data");
    }
    cachedRates = data.rates as Record<string, number>;
    lastRatesFetch = now;
    if (typeof data.rates.NGN === "number") {
      cachedRate = data.rates.NGN;
      lastFetch = now;
    }
    return cachedRates;
  } catch (error) {
    console.error("Error fetching rate map:", error);
    // Minimal fallback so conversion still works approximately.
    const ngn = getCachedRate();
    return cachedRates ?? { USD: 1, NGN: ngn };
  }
}

/**
 * Convert an NGN amount into `toCurrency` using USD-based rates.
 * amount_C = amountNgn / rates[NGN] * rates[C].
 */
export function convertFromNgn(
  amountNgn: number,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  const code = toCurrency?.toUpperCase() ?? "NGN";
  if (code === "NGN") return amountNgn;
  const ngnPerUsd = rates.NGN;
  const target = rates[code];
  if (!ngnPerUsd || !target) return amountNgn; // can't convert → show NGN value
  return (amountNgn / ngnPerUsd) * target;
}

/** Build a compact { CUR: rate } map for the currencies we actually render. */
export function buildSupportedRateMap(
  rates: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
    if (typeof rates[code] === "number") out[code] = rates[code];
  }
  if (typeof rates.NGN === "number") out.NGN = rates.NGN;
  return out;
}

/** Format an amount already expressed in `code`. */
export function formatMoney(amount: number, code: string): string {
  const meta = getCurrencyMeta(code);
  const value = amount.toLocaleString(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${meta.symbol}${value}`;
}
