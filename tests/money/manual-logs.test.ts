// Run with `npm run test:money`. End-to-end check of uploaded manual logs against a real Postgres (PGlite).
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { listing, manualLogItem, supplier } from "@/db/schema";
import {
  addManualLogItems,
  claimManualLogItems,
  clearUnsoldManualLogs,
  getManualLogCounts,
  releaseManualLogItems,
} from "@/lib/manual-logs";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}
async function stock(id: string) {
  const [l] = await db.select({ stock: listing.stock }).from(listing).where(eq(listing.id, id));
  return l.stock;
}

async function main() {
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();

  await db.insert(supplier).values({ id: "sup", name: "Manual", slug: "manual", apiUrl: "manual://local", apiKey: "manual", status: "active" });
  await db.insert(listing).values({
    id: "L1", supplierId: "sup", externalProductId: "m1", type: "account", slug: "ig-aged", title: "IG aged", platform: "instagram",
    price: "9500", currency: "NGN", supplierPrice: "9500", stock: 3, status: "active", metadata: { manual: true },
  } as never);

  console.log("\n1. Upload: blanks and duplicates skipped, stock follows unsold count");
  const up = await addManualLogItems("L1", "a:1\n\n b:2 \na:1\nc:3\nd:4\ne:5\n");
  check("5 added, 1 duplicate skipped", up.added === 5 && up.skipped === 1, up);
  check("stock = 5", (await stock("L1")) === 5);
  const again = await addManualLogItems("L1", "a:1\nf:6");
  check("re-upload skips already stored line", again.added === 1 && again.skipped === 1, again);
  check("stock = 6", (await stock("L1")) === 6);

  console.log("\n2. Purchase claims oldest logs, each once");
  const got = await claimManualLogItems("L1", 2, "order-1");
  check("order-1 gets 2 logs", got.length === 2, got);
  check("stock = 4", (await stock("L1")) === 4);

  console.log("\n3. Ten simultaneous buyers of 1 each with 4 left: exactly 4 succeed, no log shared");
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) => claimManualLogItems("L1", 1, `race-${i}`))
  );
  const winners = results.filter((r) => r.length === 1).map((r) => r[0]);
  check("4 buyers served", winners.length === 4, winners);
  check("no log handed out twice", new Set([...winners, ...got]).size === winners.length + got.length);
  check("stock = 0", (await stock("L1")) === 0);

  console.log("\n4. Not enough left: claim returns nothing and holds nothing");
  await addManualLogItems("L1", "g:7");
  const short = await claimManualLogItems("L1", 3, "order-big");
  check("short claim returns []", short.length === 0, short);
  const held = await db.select().from(manualLogItem).where(eq(manualLogItem.orderId, "order-big"));
  check("nothing left attached to the failed order", held.length === 0, held);
  check("stock = 1 (still on sale)", (await stock("L1")) === 1);

  console.log("\n5. Release puts logs back; clear removes only unsold");
  const one = await claimManualLogItems("L1", 1, "order-2");
  check("claimed last one", one.length === 1 && (await stock("L1")) === 0);
  await releaseManualLogItems("order-2");
  const counts = (await getManualLogCounts(["L1"])).get("L1");
  check("released back to available", counts?.available === 1, counts);
  const removed = await clearUnsoldManualLogs("L1");
  const after = (await getManualLogCounts(["L1"])).get("L1");
  check("clear removed 1 unsold, kept sold", removed === 1 && after?.available === 0 && after?.sold === 6, after);
  check("stock = 0", (await stock("L1")) === 0);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("CRASHED:", e); process.exit(1); });
