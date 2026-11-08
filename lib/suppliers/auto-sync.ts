import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { syncListingsForSupplier } from "./sync";
import { isAccszone } from "./accszone";

let lastSyncTime = 0;
let isSyncing = false;
const SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour

export async function autoSyncIfStale() {
  const now = Date.now();
  if (isSyncing || now - lastSyncTime < SYNC_INTERVAL) return;

  isSyncing = true;
  try {
    const suppliers = await db.select().from(supplier);
    for (const sup of suppliers) {
      // A supplier switched off in the admin panel stays off: re-syncing it
      // would put its listings back on the storefront.
      if (sup.status !== "active") continue;
      if (!sup.apiUrl || !sup.apiKey) continue;
      // AccsZone takes a minute or two (rate limited): only the cron and the
      // admin sync button refresh it, never a shopper's page load.
      if (isAccszone(sup.apiUrl)) continue;
      try {
        await syncListingsForSupplier(sup.id);
      } catch (e) {
        console.error(`[AutoSync] Failed for supplier ${sup.id}:`, e);
      }
    }
    lastSyncTime = Date.now();
  } catch (e) {
    console.error("[AutoSync] Failed:", e);
  } finally {
    isSyncing = false;
  }
}
