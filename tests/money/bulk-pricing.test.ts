// Run with `npm run test:money`. Flat bulk discount: ₦ off each piece, never down to what a log costs us.
import { bulkUnitPrice, listingCostNgn, unitPriceForQuantity, type BulkPricing } from "@/lib/bulk-pricing";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

const on: BulkPricing = { enabled: true, minQty: 10, amountOff: 100 };
const rate = 1500;

console.log("\n1. Flat amount off each piece");
// A cheap supplier log: $0.20 = ₦300 cost, sold at ₦500 (₦200 flat fee).
const cheap = { supplierPrice: "0.20", metadata: null };
const cheapCost = listingCostNgn(cheap, rate);
check("cost is supplier price × rate", cheapCost === 300, cheapCost);
check("₦500 log → ₦400 in bulk", bulkUnitPrice(500, cheapCost, on) === 400);
check("dear ₦9,000 log gets the same ₦100 off", bulkUnitPrice(9000, 6000, on) === 8900);

console.log("\n2. Never down to cost");
check("₦200 off a ₦500 log costing ₦300 → no bulk price (would hit cost)", bulkUnitPrice(500, cheapCost, { ...on, amountOff: 200 }) === null);
check("₦199 off → ₦301, just above cost", bulkUnitPrice(500, cheapCost, { ...on, amountOff: 199 }) === 301);
check("checkout keeps the normal price when there's no bulk price", unitPriceForQuantity(500, cheapCost, 20, { ...on, amountOff: 250 }) === 500);

console.log("\n3. Uploaded (manual) logs cost us nothing, but never go to ₦0");
const manual = { supplierPrice: "800", metadata: { manual: true } };
check("manual cost is 0", listingCostNgn(manual, rate) === 0);
check("₦800 manual log → ₦700", bulkUnitPrice(800, 0, on) === 700);
check("discount ≥ price → no bulk price", bulkUnitPrice(80, 0, on) === null);

console.log("\n4. Quantity and the switch");
check("below the bulk quantity: normal price", unitPriceForQuantity(500, cheapCost, 9, on) === 500);
check("at the bulk quantity: bulk price", unitPriceForQuantity(500, cheapCost, 10, on) === 400);
check("switched off: no bulk price", bulkUnitPrice(500, cheapCost, { ...on, enabled: false }) === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
