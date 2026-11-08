/**
 * GrizzlySMS (grizzlysms.com): the SMS-Activate protocol on
 * https://api.grizzlysms.com/stubs/handler_api.php. Prices are USD. Answers
 * are plain text ("ACCESS_NUMBER:id:phone", "NO_NUMBERS") or JSON.
 * Notes: docs/otp-providers.md.
 */
import { appId, countryId } from "./catalog";
import { appLabel } from "./labels";
import {
  cached,
  OtpProviderError,
  type OtpCheck,
  type OtpCountry,
  type OtpProvider,
  type ProviderApp,
  type Quote,
} from "./types";

const BASE = "https://api.grizzlysms.com/stubs/handler_api.php";
const ENV = "GRIZZLY_API_KEY";
const ERRORS = /^(BAD_KEY|BAD_ACTION|BAD_SERVICE|BAD_STATUS|NO_BALANCE|NO_NUMBERS|NO_ACTIVATION|WRONG_[A-Z_]+|ERROR_SQL|SQL_ERROR|SERVER_ERROR|SERVICE_UNAVAILABLE_REGION|EARLY_CANCEL_DENIED|BANNED[:\w]*)$/;

async function call(action: string, params: Record<string, string> = {}): Promise<string> {
  const key = process.env[ENV]?.trim();
  if (!key) throw new OtpProviderError("GrizzlySMS isn't configured");
  let res: Response;
  try {
    res = await fetch(`${BASE}?${new URLSearchParams({ api_key: key, action, ...params })}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    throw new OtpProviderError(`GrizzlySMS unreachable (${err instanceof Error ? err.name : "network"})`);
  }
  const text = (await res.text()).trim();
  if (ERRORS.test(text) || text.startsWith("The service is prohibited")) throw new OtpProviderError(text);
  if (!res.ok) throw new OtpProviderError(text.slice(0, 200) || `GrizzlySMS error (HTTP ${res.status})`);
  return text;
}

async function callJson<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const text = await call(action, params);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new OtpProviderError(text.slice(0, 200) || "GrizzlySMS sent an unreadable answer");
  }
}

type Catalog = {
  /** Rogue country id → Grizzly country id, and back. */
  countries: Map<string, string>;
  byGrizzlyCountry: Map<string, string>;
  names: OtpCountry[];
  /** Grizzly service code → its name. */
  services: Map<string, string>;
};

const catalog = cached<Catalog>(6 * 60 * 60 * 1000, async () => {
  const [countriesRaw, servicesRaw] = await Promise.all([
    callJson<unknown>("getCountries"),
    callJson<unknown>("getServicesList").catch(() => null),
  ]);

  const countries = new Map<string, string>();
  const byGrizzlyCountry = new Map<string, string>();
  const names: OtpCountry[] = [];
  const list = Array.isArray(countriesRaw) ? countriesRaw : Object.values((countriesRaw as object) ?? {});
  for (const c of list as Array<{ id?: unknown; eng?: unknown; name?: unknown; visible?: unknown }>) {
    if (c?.visible === 0 || c?.visible === "0") continue;
    const gid = c?.id === undefined ? null : String(c.id);
    const name = String(c?.eng ?? c?.name ?? "").trim();
    const id = name ? countryId(name) : null;
    if (gid === null || !id || countries.has(id)) continue;
    countries.set(id, gid);
    byGrizzlyCountry.set(gid, id);
    names.push({ id, name });
  }

  // getServicesList: [{code,name}], {services:[…]}, or {code: name}.
  const services = new Map<string, string>();
  const s = servicesRaw as { services?: unknown } | unknown[] | Record<string, unknown> | null;
  const arr = Array.isArray(s) ? s : Array.isArray((s as { services?: unknown })?.services) ? ((s as { services: unknown[] }).services) : null;
  if (arr) {
    for (const x of arr as Array<{ code?: unknown; name?: unknown }>) {
      if (x?.code) services.set(String(x.code), String(x.name ?? x.code));
    }
  } else if (s && typeof s === "object") {
    for (const [code, name] of Object.entries(s)) if (typeof name === "string") services.set(code, name);
  }
  return { countries, byGrizzlyCountry, names, services };
});

/** Cheapest price level that has numbers: {"0.52": 20, "0.325": 65} → $0.325, 85 in stock. */
function cheapestInStock(levels: unknown): { priceUsd: number; stock: number } | null {
  if (!levels || typeof levels !== "object") return null;
  const l = levels as Record<string, unknown> & { cost?: unknown; count?: unknown };
  // getPrices (v1) shape: {cost, count}.
  if ("cost" in l || "count" in l) {
    const cost = Number(l.cost);
    const count = Number(l.count);
    return cost > 0 && count > 0 ? { priceUsd: cost, stock: count } : null;
  }
  let priceUsd = Infinity;
  let stock = 0;
  for (const [price, count] of Object.entries(l)) {
    const p = Number(price);
    const n = Number(count);
    if (!(p > 0) || !(n > 0)) continue;
    stock += n;
    priceUsd = Math.min(priceUsd, p);
  }
  return stock > 0 ? { priceUsd, stock } : null;
}

/** Prices for one country (optionally one service): service code → levels. */
async function prices(gid: string, service?: string): Promise<Record<string, unknown>> {
  const params: Record<string, string> = { country: gid, ...(service ? { service } : {}) };
  const data = await callJson<Record<string, Record<string, unknown>>>("getPricesV2", params).catch(() =>
    callJson<Record<string, Record<string, unknown>>>("getPrices", params),
  );
  return data?.[gid] ?? {};
}

function serviceCode(cat: Catalog, app: string): string | null {
  for (const [code, name] of cat.services) if (appId(name) === app) return code;
  // Without the service list, apps are listed under their Grizzly code.
  return cat.services.size === 0 ? app : null;
}

export const grizzly: OtpProvider = {
  name: "grizzly",
  envKey: ENV,
  configured: () => !!process.env[ENV]?.trim(),

  async countries() {
    return (await catalog()).names;
  },

  async apps(country) {
    const cat = await catalog();
    const gid = cat.countries.get(country);
    if (gid === undefined) return [];
    const byCode = await prices(gid);
    const out: ProviderApp[] = [];
    for (const [code, levels] of Object.entries(byCode)) {
      const s = cheapestInStock(levels);
      if (!s) continue;
      const name = cat.services.get(code) ?? code;
      const app = appId(name);
      out.push({ app, label: appLabel(app, name), priceUsd: s.priceUsd, stock: s.stock });
    }
    return out;
  },

  async quote(country, app): Promise<Quote | null> {
    const cat = await catalog();
    const gid = cat.countries.get(country);
    const code = serviceCode(cat, app);
    if (gid === undefined || !code) return null;
    const s = cheapestInStock((await prices(gid, code))[code]);
    return s ? { provider: "grizzly", ...s } : null;
  },

  async buy(country, app, quote) {
    const cat = await catalog();
    const gid = cat.countries.get(country);
    const code = serviceCode(cat, app);
    if (gid === undefined || !code) throw new OtpProviderError("NO_NUMBERS");
    const text = await call("getNumber", { service: code, country: gid, maxPrice: String(quote.priceUsd) });
    const m = text.match(/^ACCESS_NUMBER:([^:]+):(\d+)/);
    if (!m) {
      console.error("[OTP] unexpected Grizzly buy answer", text.slice(0, 200));
      throw new OtpProviderError("GrizzlySMS returned no number");
    }
    return { numberId: m[1], number: m[2], priceUsd: quote.priceUsd };
  },

  async check(numberId): Promise<OtpCheck> {
    const text = await call("getStatus", { id: numberId }).catch((err) => {
      // A number Grizzly no longer knows has closed (and been refunded).
      if (err instanceof OtpProviderError && err.message === "NO_ACTIVATION") return "STATUS_CANCEL";
      throw err;
    });
    if (text.startsWith("STATUS_OK")) {
      const code = text.split(":").slice(1).join(":").trim() || null;
      return { status: "RECEIVED", code, sms: null };
    }
    if (text.startsWith("STATUS_CANCEL")) return { status: "CANCELED", code: null, sms: null };
    return { status: "PENDING", code: null, sms: null };
  },

  async cancel(numberId) {
    const text = await call("setStatus", { id: numberId, status: "8" });
    if (!text.startsWith("ACCESS_CANCEL")) throw new OtpProviderError(text.slice(0, 200));
  },

  async finish(numberId) {
    await call("setStatus", { id: numberId, status: "6" }).catch(() => {});
  },

  async balance() {
    const text = await call("getBalance");
    const n = Number(text.replace(/^ACCESS_BALANCE:/, ""));
    return Number.isFinite(n) ? n : null;
  },
};
