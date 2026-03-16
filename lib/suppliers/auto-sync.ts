import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { syncListingsForSupplier } from "./sync";

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
      if (!sup.apiUrl || !sup.apiKey) continue;
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
