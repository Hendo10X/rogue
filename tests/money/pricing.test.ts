// Run with `npm run test:money`. Checks the price rules shared by the store,
// listing pages and checkout, including admin profit overrides.
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { setSetting } from "@/lib/admin-auth";
import { MARKETPLACE_PRICING_DEFAULTS, computeMarketplacePriceNgn } from "@/lib/pricing";
import { getLogProfits, priceListingNgn, setLogProfits } from "@/lib/log-profit";
import { getBoostingPricer, setServiceProfits } from "@/lib/boosting/profit";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

async function main() {
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();

  const pricing = MARKETPLACE_PRICING_DEFAULTS; // ₦1,500 flat under ₦9,000, else +20%
  const rate = 1500; // ₦ per $1

  console.log("\n1. Log prices");
  const supplierLog = { id: "L1", price: "0", supplierPrice: "2", metadata: {} };     // $2 → ₦3,000
  const bigLog = { id: "L2", price: "0", supplierPrice: "10", metadata: {} };         // $10 → ₦15,000
  const manualLog = { id: "M1", price: "7499.6", supplierPrice: "0", metadata: { manual: true } };
  let profits = await getLogProfits();
  check("cheap log: cost + ₦1,500 flat = ₦4,500", priceListingNgn(supplierLog, rate, pricing, profits) === 4500);
  check("pricey log: cost +20% = ₦18,000", priceListingNgn(bigLog, rate, pricing, profits) === 18000);
  check("manual log keeps its own (rounded) price", priceListingNgn(manualLog, rate, pricing, profits) === 7500);
  check("matches the old formula when no override", priceListingNgn(bigLog, rate, pricing, profits) === computeMarketplacePriceNgn(10, rate, pricing));

  profits = await setLogProfits(["L1", "M1"], 800);
  check("override: cost + ₦800 = ₦3,800", priceListingNgn(supplierLog, rate, pricing, profits) === 3800);
  check("override never changes a manual log", priceListingNgn(manualLog, rate, pricing, profits) === 7500);
  check("other logs untouched", priceListingNgn(bigLog, rate, pricing, profits) === 18000);
  profits = await setLogProfits(["L1"], null);
  check("reset goes back to tiered", priceListingNgn(supplierLog, rate, pricing, profits) === 4500);
  check("override persists in settings", (await getLogProfits()).get("M1") === 800);

  console.log("\n2. Boosting prices");
  await setSetting("markup_naira_boosting", "1050");
  let pricer = await getBoostingPricer();
  check("global markup: ₦1.56 + ₦1,050 = ₦1,051.56", pricer.sellRate(6451, "1.56") === 1051.56, pricer.sellRate(6451, "1.56"));
  await setServiceProfits([6451, 912], 200);
  pricer = await getBoostingPricer();
  check("per-service profit: ₦1.56 + ₦200 = ₦201.56", pricer.sellRate(6451, "1.56") === 201.56, pricer.sellRate(6451, "1.56"));
  check("profit can be ₦0 (sell at cost)", (await setServiceProfits([912], 0), (await getBoostingPricer()).sellRate(912, "2200")) === 2200);
  check("unrelated service still uses global", pricer.sellRate(1101, "700") === 1750);
  await setServiceProfits([6451], null);
  pricer = await getBoostingPricer();
  check("reset goes back to global", pricer.sellRate(6451, "1.56") === 1051.56);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("CRASHED:", e); process.exit(1); });
