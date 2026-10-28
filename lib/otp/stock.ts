import { getSetting, setSetting } from "@/lib/admin-auth";

/**
 * Backup for stock: 5sim lists only apps with numbers, but one can still sell
 * out between listing and buying. A purchase that finds none hides that app for
 * that country until an admin shows it again (Settings → OTP numbers).
 */
const KEY = "otp_out_of_stock";

type Hidden = Record<string, number>; // "country|app" -> when it was hidden (ms)

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
  const hidden = new Set<string>();
  for (const k of Object.keys(await read())) {
    const [c, ...rest] = k.split("|");
    if (c === country) hidden.add(rest.join("|"));
  }
  return hidden;
}

/** How many country/app pairs are hidden, for the admin card. */
export async function hiddenCount(): Promise<number> {
  return Object.keys(await read()).length;
}

export async function markOutOfStock(country: string, app: string) {
  const all = await read();
  all[keyOf(country, app)] = Date.now();
  await setSetting(KEY, JSON.stringify(all));
}

/** Shows every hidden app again (admin action). */
export async function clearOutOfStock() {
  await setSetting(KEY, "{}");
}

/**
 * A buy failure that means "nothing to sell" (5sim says "no free phones"), as
 * opposed to our balance, key, rate limit or a passing outage, which must
 * never hide an app.
 */
export function looksOutOfStock(message: string): boolean {
  return /no free phones|no (numbers|phones) available|out of stock/i.test(message);
}
