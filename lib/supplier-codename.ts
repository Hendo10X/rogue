/**
 * Customers (and API resellers) never see which supplier a log comes from,
 * only a codename. Admin pages keep the real names.
 */
const KNOWN: Record<string, string> = {
  shopviaclone: "Atlas",
  acctshop: "Nova",
};
const SPARE = ["Orion", "Vega", "Titan", "Echo", "Zephyr", "Onyx"];

export function supplierCodename(name?: string | null): string {
  const key = (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!key) return "Rogue";
  if (key.includes("manual") || key.includes("rogue")) return "Rogue";
  for (const [k, code] of Object.entries(KNOWN)) if (key.includes(k)) return code;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SPARE[h % SPARE.length];
}

/** Generic wording for a supplier failure, safe to show a customer or reseller. */
export function publicSupplierError(raw: string): string {
  if (/insufficient|balance|fund/i.test(raw)) return "This item is temporarily unavailable.";
  if (/stock|sold out|not enough|unavailable/i.test(raw)) return "This item is out of stock.";
  if (/link|url|username|invalid/i.test(raw)) return "The supplier couldn't accept this order. Check the link and try again.";
  return "The order couldn't be completed right now.";
}
