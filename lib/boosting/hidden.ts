import { getSetting, setSetting } from "@/lib/admin-auth";

import { ACTIVE_SUPPLIER } from "@/lib/boosting/provider";

// Boosting services are fetched live from the provider (no DB row per service),
// so "hidden from storefront" is persisted as a blocklist of service IDs in
// admin_settings. IDs are only meaningful for one supplier, so the list is
// keyed by supplier — the old Socially.ng list stays under the original
// "boosting_hidden_services" key and never hides unrelated services.
const KEY = `boosting_hidden_services_${ACTIVE_SUPPLIER}`;

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
