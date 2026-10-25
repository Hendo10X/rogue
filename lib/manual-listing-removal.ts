import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { listing, order } from "@/db/schema";

/**
 * Permanently removes inactive manual logs. A log that was ever bought can't
 * be deleted without wiping customers' order history, so those are archived
 * instead: hidden from the store and the admin lists, orders untouched.
 */
export async function removeInactiveManualListings(ids: string[]) {
  if (ids.length === 0) return { deleted: 0, archived: 0, skippedActive: 0 };

  const rows = await db
    .select({ id: listing.id, status: listing.status })
    .from(listing)
    .where(and(inArray(listing.id, ids), sql`${listing.metadata} ->> 'manual' = 'true'`));
  const inactive = rows.filter((r: { status: string }) => r.status !== "active").map((r: { id: string }) => r.id);
  const skippedActive = rows.length - inactive.length;
  if (inactive.length === 0) return { deleted: 0, archived: 0, skippedActive };

  const withOrders = new Set(
    (
      await db
        .selectDistinct({ listingId: order.listingId })
        .from(order)
        .where(inArray(order.listingId, inactive))
    ).map((r: { listingId: string }) => r.listingId),
  );
  const toDelete = inactive.filter((id: string) => !withOrders.has(id));
  const toArchive = inactive.filter((id: string) => withOrders.has(id));

  // Uploaded log lines go with the listing (ON DELETE CASCADE).
  if (toDelete.length) await db.delete(listing).where(inArray(listing.id, toDelete));
  if (toArchive.length) {
    await db
      .update(listing)
      .set({
        status: "inactive",
        metadata: sql`coalesce(${listing.metadata}, '{}'::jsonb) || '{"archived": true}'::jsonb`,
        updatedAt: new Date(),
      })
      .where(inArray(listing.id, toArchive));
  }
  return { deleted: toDelete.length, archived: toArchive.length, skippedActive };
}

/** Ids of the manual logs in a category (by its exact name). */
export async function manualListingIdsInCategory(categoryName: string): Promise<string[]> {
  const rows = await db
    .select({ id: listing.id })
    .from(listing)
    .where(and(eq(listing.categoryName, categoryName), sql`${listing.metadata} ->> 'manual' = 'true'`));
  return rows.map((r: { id: string }) => r.id);
}
