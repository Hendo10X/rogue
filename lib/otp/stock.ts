import { getSetting, setSetting } from "@/lib/admin-auth";

/**
 * otpking doesn't report stock: the only sign an app is empty is a failed
 * get_number. So a failed purchase hides that app for that country, and it
 * reappears after OUT_OF_STOCK_HOURS to try again; a successful purchase
 * clears it straight away.
 */
const KEY = "otp_out_of_stock";
export const OUT_OF_STOCK_HOURS = 3;

type Hidden = Record<string, number>; // "country|app" -> hidden until (ms)

const keyOf = (country: string, app: string) => `${country}|${app}`;

async function read(): Promise<Hidden> {
  try {
    const raw = await getSetting(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as Hidden) : {};
  } catch {
    return {};
  }
}

/** App names currently hidden for one country. */
export async function outOfStockApps(country: string): Promise<Set<string>> {
  const now = Date.now();
  const hidden = new Set<string>();
  for (const [k, until] of Object.entries(await read())) {
    const [c, ...rest] = k.split("|");
    if (c === country && until > now) hidden.add(rest.join("|"));
  }
  return hidden;
}

export async function markOutOfStock(country: string, app: string) {
  const now = Date.now();
  const all = await read();
  // Drop expired entries so the setting doesn't grow forever.
  const next: Hidden = Object.fromEntries(Object.entries(all).filter(([, until]) => until > now));
  next[keyOf(country, app)] = now + OUT_OF_STOCK_HOURS * 60 * 60 * 1000;
  await setSetting(KEY, JSON.stringify(next));
}

export async function markInStock(country: string, app: string) {
  const all = await read();
  if (!(keyOf(country, app) in all)) return;
  delete all[keyOf(country, app)];
  await setSetting(KEY, JSON.stringify(all));
}

/** A get_number failure that means "nothing to sell", not a problem on our side (e.g. our balance). */
export function looksOutOfStock(message: string): boolean {
  if (/balance|credit|insufficient|fund|api ?key|inactive|unauthori|limit|too many/i.test(message)) return false;
  return true;
}
