import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { supplier, listing, order, supplierOrder } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

// DELETE — remove a supplier from the web app. Order history is protected by
// FK "restrict" constraints (order.listingId, supplierOrder.supplierId), so we
// hard-delete only what was never sold and retire (deactivate) the rest:
//   - listings with no orders  -> deleted
//   - listings with orders     -> kept but set inactive (hidden from storefront)
//   - supplier with no supplier_orders and no retained listings -> deleted
//   - otherwise                -> supplier set inactive
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [sup] = await db
    .select()
    .from(supplier)
    .where(eq(supplier.id, id))
    .limit(1);
  if (!sup) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const listings = await db
    .select({ id: listing.id })
    .from(listing)
    .where(eq(listing.supplierId, id));
  const listingIds: string[] = listings.map((l: { id: string }) => l.id);

  let deletedListings = 0;
  let retainedListings = 0;

  if (listingIds.length > 0) {
    const sold = await db
      .selectDistinct({ listingId: order.listingId })
      .from(order)
      .where(inArray(order.listingId, listingIds));
    const soldSet = new Set(
      sold.map((o: { listingId: string }) => o.listingId),
    );

    const deletable = listingIds.filter((lid) => !soldSet.has(lid));
    const keep = listingIds.filter((lid) => soldSet.has(lid));

    if (deletable.length > 0) {
      await db.delete(listing).where(inArray(listing.id, deletable));
      deletedListings = deletable.length;
    }
    if (keep.length > 0) {
      await db
        .update(listing)
        .set({ status: "inactive", updatedAt: new Date() })
        .where(inArray(listing.id, keep));
      retainedListings = keep.length;
    }
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(supplierOrder)
    .where(eq(supplierOrder.supplierId, id));
  const hasSupplierOrders = Number(count) > 0;

  let supplierRemoved = false;
  if (!hasSupplierOrders && retainedListings === 0) {
    await db.delete(supplier).where(eq(supplier.id, id));
    supplierRemoved = true;
  } else {
    await db
      .update(supplier)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(supplier.id, id));
  }

  return NextResponse.json({
    name: sup.name,
    supplierRemoved,
    deletedListings,
    retainedListings,
  });
}
