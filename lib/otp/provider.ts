/**
 * OTP numbers from GrizzlySMS and SMSPool (5sim before them). Each provider
 * is switched on separately in Admin → Settings → OTP numbers and needs its
 * API key in Vercel. For each country + app the customer picks, every
 * switched-on provider is asked for a live price; the cheapest one that can
 * sell it wins. SMSPool also has to meet the minimum success rate.
 * Research and rules: docs/otp-providers.md.
 */
import { getSetting, setSetting } from "@/lib/admin-auth";
import { countryLabel } from "./catalog";
import { fivesimCancel, fivesimCheck, fivesimFinish } from "./fivesim";
import { grizzly } from "./grizzly";
import { smspool } from "./smspool";
import { OtpProviderError, type BoughtNumber, type OtpCheck, type OtpCountry, type OtpProvider, type ProviderName, type Quote } from "./types";

export { OtpProviderError } from "./types";
export type { OtpCountry, Quote } from "./types";

export const PROVIDERS: OtpProvider[] = [grizzly, smspool];
const byName = new Map<string, OtpProvider>(PROVIDERS.map((p) => [p.name, p]));

export const PROVIDER_LABELS: Record<ProviderName, string> = { grizzly: "GrizzlySMS", smspool: "SMSPool" };

// ── Settings ────────────────────────────────────────────────────────────────

const ON_KEY = (p: ProviderName) => `otp_provider_${p}`;
const MIN_SUCCESS_KEY = "otp_smspool_min_success";
const DEFAULT_MIN_SUCCESS = 60;

export type ProviderSettings = { grizzly: boolean; smspool: boolean; minSuccessRate: number };

/** Both providers start switched off, so nothing is bought from one before an admin checks it. */
export async function getProviderSettings(): Promise<ProviderSettings> {
  const [g, s, min] = await Promise.all([getSetting(ON_KEY("grizzly")), getSetting(ON_KEY("smspool")), getSetting(MIN_SUCCESS_KEY)]);
  const m = Number(min);
  return {
    grizzly: g === "true",
    smspool: s === "true",
    minSuccessRate: min !== null && Number.isFinite(m) && m >= 0 && m <= 100 ? m : DEFAULT_MIN_SUCCESS,
  };
}

export async function setProviderSettings(value: Partial<ProviderSettings>) {
  if (value.grizzly !== undefined) await setSetting(ON_KEY("grizzly"), String(value.grizzly));
  if (value.smspool !== undefined) await setSetting(ON_KEY("smspool"), String(value.smspool));
  if (value.minSuccessRate !== undefined) await setSetting(MIN_SUCCESS_KEY, String(value.minSuccessRate));
}

/** Providers that have a key and are switched on. */
export async function activeProviders(): Promise<OtpProvider[]> {
  const s = await getProviderSettings();
  return PROVIDERS.filter((p) => p.configured() && s[p.name]);
}

/** True when at least one provider has its API key set. */
export function otpProviderConfigured(): boolean {
  return PROVIDERS.some((p) => p.configured());
}

// ── Lists ───────────────────────────────────────────────────────────────────

export type OtpApp = { name: string; label: string; priceUsd: number; stock: number | null };

/** Runs `fn` on every active provider; one failing doesn't hide the others' results. */
async function fromAll<T>(fn: (p: OtpProvider) => Promise<T>, what: string): Promise<T[]> {
  const providers = await activeProviders();
  if (providers.length === 0) return [];
  const results = await Promise.allSettled(providers.map(fn));
  const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[OTP] ${providers[i].name} ${what} failed`, r.reason);
  });
  if (ok.length === 0) {
    const first = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw first?.reason ?? new OtpProviderError(`Couldn't load ${what}`);
  }
  return ok;
}

/** Countries any active provider sells, each once, by name. */
export async function fetchCountries(): Promise<OtpCountry[]> {
  const lists = await fromAll((p) => p.countries(), "countries");
  const ids = new Set(lists.flat().map((c) => c.id));
  return [...ids].map((id) => ({ id, name: countryLabel(id) })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Apps for one country across providers, each at its lowest listed price. */
export async function fetchApps(country: string): Promise<OtpApp[]> {
  const lists = await fromAll((p) => p.apps(country), "apps");
  const merged = new Map<string, OtpApp>();
  for (const a of lists.flat()) {
    const prev = merged.get(a.app);
    if (!prev) {
      merged.set(a.app, { name: a.app, label: a.label, priceUsd: a.priceUsd, stock: a.stock });
      continue;
    }
    prev.priceUsd = Math.min(prev.priceUsd, a.priceUsd);
    prev.stock = prev.stock === null || a.stock === null ? (prev.stock ?? a.stock) : prev.stock + a.stock;
  }
  return [...merged.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The best live quote for one country + app: the cheapest provider that has
 * numbers right now (SMSPool only from pools meeting the success-rate
 * minimum). Ties go to Grizzly. Null when nobody can sell it.
 */
export async function fetchAppLive(country: string, app: string): Promise<Quote | null> {
  const { minSuccessRate } = await getProviderSettings();
  const quotes = await fromAll((p) => p.quote(country, app, { minSuccessRate }), "live price");
  const best = quotes
    .filter((q): q is Quote => !!q)
    .sort((a, b) => a.priceUsd - b.priceUsd || (a.provider === "grizzly" ? -1 : 1))[0];
  return best ?? null;
}

// ── Numbers ─────────────────────────────────────────────────────────────────

/**
 * Buys from the provider that gave the quote, capped at the quoted price.
 * The saved id is "grizzly:…" or "smspool:…" so later checks reach the
 * right provider. Ids without a prefix are 5sim numbers from before the switch.
 */
export async function buyNumber(country: string, app: string, quote: Quote): Promise<BoughtNumber> {
  const p = byName.get(quote.provider);
  if (!p) throw new OtpProviderError("Unknown OTP provider");
  const bought = await p.buy(country, app, quote);
  return { ...bought, numberId: `${p.name}:${bought.numberId}` };
}

function route(numberId: string): { provider: OtpProvider | null; id: string } {
  const i = numberId.indexOf(":");
  const p = i > 0 ? byName.get(numberId.slice(0, i)) : undefined;
  return p ? { provider: p, id: numberId.slice(i + 1) } : { provider: null, id: numberId };
}

/** Which provider sold a number, for admin views. */
export function providerOf(numberId: string | null | undefined): string {
  if (!numberId) return "—";
  const { provider } = route(numberId);
  return provider ? PROVIDER_LABELS[provider.name] : "5sim";
}

export async function checkNumber(numberId: string): Promise<OtpCheck> {
  const { provider, id } = route(numberId);
  return provider ? provider.check(id) : fivesimCheck(id);
}

/** Cancels a number that hasn't received an SMS (the provider refunds us). */
export async function cancelNumber(numberId: string): Promise<void> {
  const { provider, id } = route(numberId);
  return provider ? provider.cancel(id) : fivesimCancel(id);
}

/** Closes a number once its code has arrived. Best effort. */
export async function finishNumber(numberId: string): Promise<void> {
  const { provider, id } = route(numberId);
  return provider ? provider.finish(id) : fivesimFinish(id);
}

export type ProviderBalance = {
  provider: ProviderName;
  label: string;
  configured: boolean;
  balanceUsd: number | null;
  error: string | null;
};

/** Every provider's balance (USD), for admin. */
export async function fetchBalances(): Promise<ProviderBalance[]> {
  return Promise.all(
    PROVIDERS.map(async (p) => {
      const base = { provider: p.name, label: PROVIDER_LABELS[p.name], configured: p.configured() };
      if (!base.configured) return { ...base, balanceUsd: null, error: null };
      try {
        return { ...base, balanceUsd: await p.balance(), error: null };
      } catch (err) {
        return { ...base, balanceUsd: null, error: err instanceof Error ? err.message : "Couldn't reach it" };
      }
    }),
  );
}
