import { db } from "../db/drizzle";
import { listing } from "../db/schema";
import { syncListingsForSupplier } from "../lib/suppliers/sync";

async function main() {
  console.log("Running platform sync & cleanup...");

  // First fetch all distinct suppliers from the listing table
  const suppliers = await db.selectDistinct({ supplierId: listing.supplierId }).from(listing);
  console.log(`Found ${suppliers.length} active suppliers. Starting sync...`);

  for (const sup of suppliers) {
    if (sup.supplierId) {
       console.log(`Syncing supplier: ${sup.supplierId}`);
       try {
         const result = await syncListingsForSupplier(sup.supplierId);
         console.log(`Synced ${result.upserted} items out of ${result.total}`);
       } catch (err) {
         console.error(`Failed to sync supplier ${sup.supplierId}:`, err);
       }
    }
  }

  console.log("Complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration fatal error", err);
  process.exit(1);
});
