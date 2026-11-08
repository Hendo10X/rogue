export class OtpProviderError extends Error {}

export type ProviderName = "grizzly" | "smspool";

export type OtpCountry = { id: string; name: string };

/** One app a provider lists for a country. `stock` is null when the provider's list doesn't say. */
export type ProviderApp = { app: string; label: string; priceUsd: number; stock: number | null };

/** A live price for one country + app from one provider, ready to buy at. */
export type Quote = {
  provider: ProviderName;
  priceUsd: number;
  stock: number;
  /** SMSPool only: the pool this price is from, and its success rate (%). */
  pool?: string;
  successRate?: number;
};

export type OtpCheck = {
  status: "PENDING" | "RECEIVED" | "CANCELED";
  code: string | null;
  sms: string | null;
};

export type BoughtNumber = { numberId: string; number: string; priceUsd: number | null };

export interface OtpProvider {
  name: ProviderName;
  /** The env var holding its API key. */
  envKey: string;
  configured(): boolean;
  countries(): Promise<OtpCountry[]>;
  apps(country: string): Promise<ProviderApp[]>;
  /** Live stock and price, or null when it can't sell this right now. */
  quote(country: string, app: string, opts: { minSuccessRate: number }): Promise<Quote | null>;
  buy(country: string, app: string, quote: Quote): Promise<BoughtNumber>;
  check(numberId: string): Promise<OtpCheck>;
  cancel(numberId: string): Promise<void>;
  finish(numberId: string): Promise<void>;
  balance(): Promise<number | null>;
}

/** Pulls a 4–8 digit code out of an SMS when the provider doesn't hand one over. */
export function codeFrom(text: string | null | undefined): string | null {
  return text?.match(/\b\d{4,8}\b/)?.[0] ?? null;
}

/** Caches a slow-changing list (countries, services) for a few hours per server instance. */
export function cached<T>(ms: number, load: () => Promise<T>): () => Promise<T> {
  let hit: { at: number; value: T } | null = null;
  let pending: Promise<T> | null = null;
  return async () => {
    if (hit && Date.now() - hit.at < ms) return hit.value;
    if (!pending) {
      pending = load()
        .then((value) => {
          hit = { at: Date.now(), value };
          return value;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };
}
