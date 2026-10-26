/**
 * otpking API (https://api.otpking.net/api.php). Every call is a GET with
 * `do=<action>&key=<key>`; answers are `{ status: { code, message }, data }`
 * and code "1000" means success. Prices are in USD.
 * Shapes of get_number / get_sms weren't documented, so they're read
 * defensively and the raw answer is logged (without the key) when unexpected.
 */
const BASE = "https://api.otpking.net/api.php";
const SUCCESS = "1000";

export class OtpProviderError extends Error {}

export function otpProviderConfigured(): boolean {
  return !!process.env.OTPKING_API_KEY?.trim();
}

async function call<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.OTPKING_API_KEY?.trim();
  if (!key) throw new OtpProviderError("OTP numbers aren't configured");
  const qs = new URLSearchParams({ do: action, ...params, key });
  let res: Response;
  try {
    res = await fetch(`${BASE}?${qs}`, { cache: "no-store", signal: AbortSignal.timeout(25_000) });
  } catch (err) {
    // Never echo the URL: it contains the key.
    throw new OtpProviderError(`OTP supplier unreachable (${err instanceof Error ? err.name : "network"})`);
  }
  const json = (await res.json().catch(() => null)) as { status?: { code?: unknown; message?: unknown }; data?: T } | null;
  if (String(json?.status?.code) === SUCCESS) return json!.data as T;
  throw new OtpProviderError(String(json?.status?.message || `OTP supplier error (HTTP ${res.status})`));
}

export type OtpCountry = { id: string; name: string };
export type OtpApp = { name: string; priceUsd: number };

export async function fetchCountries(): Promise<OtpCountry[]> {
  const data = await call<{ id?: unknown; full_name?: unknown }[]>("get_countries");
  return (Array.isArray(data) ? data : [])
    .map((c) => ({ id: String(c.id ?? ""), name: String(c.full_name ?? "") }))
    .filter((c) => c.name);
}

/** Apps for a country with their USD price. Names are what get_number expects. */
export async function fetchApps(country: string): Promise<OtpApp[]> {
  const data = await call<{ full_name?: unknown; price?: unknown }[]>("get_apps", { country });
  const seen = new Set<string>();
  const apps: OtpApp[] = [];
  for (const a of Array.isArray(data) ? data : []) {
    const name = String(a.full_name ?? "").trim();
    const priceUsd = Number(a.price);
    if (!name || !Number.isFinite(priceUsd) || priceUsd <= 0 || seen.has(name)) continue;
    seen.add(name);
    apps.push({ name, priceUsd: Math.round(priceUsd * 10_000) / 10_000 });
  }
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchOtpBalance(): Promise<number | null> {
  const data = await call<{ credits?: unknown }>("check_balance");
  const n = Number(data?.credits);
  return Number.isFinite(n) ? n : null;
}

/** First non-empty value among `keys` at the top level or one level down. */
function pick(data: unknown, keys: string[]): string | null {
  const layers = [data, ...(data && typeof data === "object" ? Object.values(data as object) : [])];
  for (const layer of layers) {
    if (!layer || typeof layer !== "object" || Array.isArray(layer)) continue;
    for (const k of keys) {
      const v = (layer as Record<string, unknown>)[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return null;
}

/** Buys a number (charges the Rogue otpking balance). */
export async function buyNumber(country: string, app: string) {
  const data = await call<unknown>("get_number", { country, app });
  const numberId = pick(data, ["id", "number_id", "activation_id", "order_id"]);
  const number = pick(data, ["number", "phone", "phone_number", "msisdn"]);
  if (!numberId || !number) {
    console.error("[OTP] unexpected get_number answer", JSON.stringify(data).slice(0, 500));
    throw new OtpProviderError("OTP supplier returned no number");
  }
  return { numberId, number };
}

/**
 * The SMS for a bought number, or null while still waiting. otpking answers a
 * non-success code while nothing has arrived, so errors read as "not yet".
 */
export async function readSms(country: string, app: string, number: string): Promise<{ code: string | null; sms: string } | null> {
  let data: unknown;
  try {
    data = await call<unknown>("get_sms", { country, app, number });
  } catch {
    return null;
  }
  const sms = pick(data, ["sms", "message", "text", "full_sms", "msg"]) ?? (typeof data === "string" ? data.trim() : null);
  const code = pick(data, ["code", "otp", "sms_code"]) ?? sms?.match(/\b\d{4,8}\b/)?.[0] ?? null;
  if (!sms && !code) return null;
  return { code, sms: sms ?? code ?? "" };
}

/** Cancels a number that hasn't received an SMS. Throws if otpking refuses. */
export async function cancelNumber(numberId: string): Promise<void> {
  await call<unknown>("cancel_number", { number_id: numberId });
}
