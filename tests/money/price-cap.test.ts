// Run with `npm run test:money`. The "hide logs above ₦X" cap only hides AcctShop logs:
// an expensive AccsZone log (e.g. an 18k-follower TikTok) stays on the store.
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { adminSettings, listing, supplier } from "@/db/schema";
import { NextRequest } from "next/server";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

globalThis.fetch = (async (input: string | URL) => {
  if (String(input).includes("exchangerate")) return new Response(JSON.stringify({ rates: { NGN: 1500 } }));
  return new Response("not mocked", { status: 500 });
}) as typeof fetch;

async function main() {
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();

  // Cap ₦44,000; 20% markup above the threshold. $40 × 1,500 × 1.2 = ₦72,000 (over the cap).
  await db.insert(adminSettings).values([
    { key: "mp_price_cap_naira", value: "44000" },
    { key: "mp_percent", value: "20" },
  ]);
  // Empty API keys keep the store's background sync from running in the test.
  await db.insert(supplier).values([
    { id: "as", name: "AcctShop", slug: "acctshop", apiUrl: "https://acctshop.example", apiKey: "", status: "active" },
    { id: "az", name: "AccsZone", slug: "accszone", apiUrl: "https://accszone.example", apiKey: "", status: "active" },
    { id: "mn", name: "Manual", slug: "manual", apiUrl: "manual://local", apiKey: "", status: "active" },
  ]);
  const row = (id: string, supplierId: string, usd: string, metadata: Record<string, unknown> = {}) => ({
    id, supplierId, externalProductId: id, type: "account", slug: id, title: id, platform: "tiktok",
    price: usd, currency: "USD", supplierPrice: usd, stock: 5, status: "active", metadata,
  });
  await db.insert(listing).values([
    row("acctshop-dear", "as", "40"),
    row("acctshop-cheap", "as", "10"),
    row("accszone-tiktok-18k", "az", "40", { source: "accszone" }),
    row("manual-dear", "mn", "90000", { manual: true }),
  ] as never);

  const { GET } = await import("@/app/api/marketplace/listings/route");
  const res = await GET(new NextRequest("http://localhost/api/marketplace/listings?limit=50"));
  const data = (await res.json()) as { items: { id: string }[] };
  const ids = new Set(data.items.map((i) => i.id));

  console.log("\n1. The cap only hides AcctShop logs");
  check("AcctShop log above ₦44,000 is hidden", !ids.has("acctshop-dear"), [...ids]);
  check("AcctShop log under the cap shows", ids.has("acctshop-cheap"), [...ids]);
  check("AccsZone log above ₦44,000 shows (the TikTok case)", ids.has("accszone-tiktok-18k"), [...ids]);
  check("Uploaded (manual) log shows whatever its price", ids.has("manual-dear"), [...ids]);

  await db.update(adminSettings).set({ value: "0" });
  const all = (await (await GET(new NextRequest("http://localhost/api/marketplace/listings?limit=50"))).json()) as { items: { id: string }[] };
  check("cap 0 = nothing hidden", all.items.some((i) => i.id === "acctshop-dear"), all.items.map((i) => i.id));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
