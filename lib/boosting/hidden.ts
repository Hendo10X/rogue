import { getSetting, setSetting } from "@/lib/admin-auth";

// Boosting services are fetched live from the provider (no DB row per service),
// so "hidden from storefront" is persisted as a blocklist of service IDs in
// admin_settings under this key.
const KEY = "boosting_hidden_services";

export async function getHiddenServiceIds(): Promise<Set<number>> {
  const raw = await getSetting(KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Set(
        arr
          .map((n: unknown) => Number(n))
          .filter((n: number) => Number.isFinite(n)),
      );
    }
  } catch {
    /* malformed setting -> treat as empty */
  }
  return new Set();
}

export async function setHiddenServiceIds(ids: number[]): Promise<number[]> {
  const unique = Array.from(
    new Set(ids.filter((n) => Number.isFinite(n))),
  ).sort((a, b) => a - b);
  await setSetting(KEY, JSON.stringify(unique));
  return unique;
}

// Add or remove a single service id from the hidden set. Returns the new list.
export async function setServiceHidden(
  serviceId: number,
  hidden: boolean,
): Promise<number[]> {
  const set = await getHiddenServiceIds();
  if (hidden) set.add(serviceId);
  else set.delete(serviceId);
  return setHiddenServiceIds(Array.from(set));
}
