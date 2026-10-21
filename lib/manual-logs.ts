import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { listing, manualLogItem } from "@/db/schema";

/** Most lines accepted in one upload, to keep a single request reasonable. */
export const MAX_UPLOAD_LINES = 5000;

function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length <= 2000);
}

/**
 * Keep `listing.stock` equal to the unsold uploaded logs. Only applies once a
 * listing has had logs uploaded; older count-only manual listings keep their
 * hand-set stock.
 */
export async function syncManualStock(listingId: string): Promise<number | null> {
  const [counts] = await db
    .select({
      total: count(),
      available: sql<number>`count(*) filter (where ${manualLogItem.status} = 'available')`,
    })
    .from(manualLogItem)
    .where(eq(manualLogItem.listingId, listingId));

  if (!counts || Number(counts.total) === 0) return null;
  const available = Number(counts.available);
  await db
    .update(listing)
    .set({ stock: available, updatedAt: new Date() })
    .where(eq(listing.id, listingId));
  return available;
}

/**
 * Add logs (one per line) to a manual listing. Blank lines, duplicates within
 * the upload and lines already stored for this listing are skipped.
 */
export async function addManualLogItems(
  listingId: string,
  rawText: string
): Promise<{ added: number; skipped: number; available: number }> {
  const lines = parseLines(rawText);
  if (lines.length > MAX_UPLOAD_LINES) {
    throw new Error(`Upload at most ${MAX_UPLOAD_LINES.toLocaleString()} logs at a time.`);
  }

  const unique = Array.from(new Set(lines));
  const existing = unique.length
    ? await db
        .select({ content: manualLogItem.content })
        .from(manualLogItem)
        .where(and(eq(manualLogItem.listingId, listingId), inArray(manualLogItem.content, unique)))
    : [];
  const seen = new Set(existing.map((r: { content: string }) => r.content));
  const fresh = unique.filter((l) => !seen.has(l));

  // Insert in chunks so a big upload never becomes one giant statement.
  for (let i = 0; i < fresh.length; i += 500) {
    await db.insert(manualLogItem).values(
      fresh.slice(i, i + 500).map((content) => ({
        id: crypto.randomUUID(),
        listingId,
        content,
      }))
    );
  }

  const available = (await syncManualStock(listingId)) ?? 0;
  return { added: fresh.length, skipped: lines.length - fresh.length, available };
}

/** Remove every unsold log from a listing (sold ones stay as a record). */
export async function clearUnsoldManualLogs(listingId: string): Promise<number> {
  const removed = await db
    .delete(manualLogItem)
    .where(and(eq(manualLogItem.listingId, listingId), eq(manualLogItem.status, "available")))
    .returning({ id: manualLogItem.id });
  await syncManualStock(listingId);
  return removed.length;
}

/**
 * Atomically hand `quantity` unsold logs to an order. One UPDATE claims the
 * rows (SKIP LOCKED keeps concurrent buyers from ever sharing a log). If fewer
 * than `quantity` are available the claim is undone and [] is returned, so the
 * caller can fall back to manual delivery.
 */
export async function claimManualLogItems(
  listingId: string,
  quantity: number,
  orderId: string
): Promise<string[]> {
  const result = await db.execute(sql`
    UPDATE ${manualLogItem}
       SET status = 'sold', order_id = ${orderId}, sold_at = now()
     WHERE id IN (
       SELECT id FROM ${manualLogItem}
        WHERE listing_id = ${listingId} AND status = 'available'
        ORDER BY created_at, id
        LIMIT ${quantity}
        FOR UPDATE SKIP LOCKED
     )
 RETURNING content
  `);
  const rows = ((result as { rows?: { content: string }[] }).rows ?? (result as unknown as { content: string }[])) || [];
  const contents = rows.map((r) => r.content);

  if (contents.length < quantity) {
    if (contents.length > 0) await releaseManualLogItems(orderId);
    return [];
  }
  await syncManualStock(listingId);
  return contents;
}

/** Put an order's claimed logs back on the shelf (e.g. if the order fails). */
export async function releaseManualLogItems(orderId: string): Promise<void> {
  await db
    .update(manualLogItem)
    .set({ status: "available", orderId: null, soldAt: null })
    .where(and(eq(manualLogItem.orderId, orderId), eq(manualLogItem.status, "sold")));
}

/** Uploaded / unsold / sold counts per listing, for the admin list. */
export async function getManualLogCounts(
  listingIds: string[]
): Promise<Map<string, { available: number; sold: number }>> {
  const map = new Map<string, { available: number; sold: number }>();
  if (listingIds.length === 0) return map;
  const rows = await db
    .select({
      listingId: manualLogItem.listingId,
      available: sql<number>`count(*) filter (where ${manualLogItem.status} = 'available')`,
      sold: sql<number>`count(*) filter (where ${manualLogItem.status} = 'sold')`,
    })
    .from(manualLogItem)
    .where(inArray(manualLogItem.listingId, listingIds))
    .groupBy(manualLogItem.listingId);
  for (const r of rows) {
    map.set(r.listingId, { available: Number(r.available), sold: Number(r.sold) });
  }
  return map;
}
