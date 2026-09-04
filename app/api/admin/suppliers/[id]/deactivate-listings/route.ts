import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { supplier, listing } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

// POST — pull every one of a supplier's listings off the storefront without
// deleting anything, and mark the supplier inactive so the sync leaves it
// alone. For a supplier that is no longer wired up (StoreSM, say): its
// listings can never be fulfilled, so every purchase fails and lands the
// order in manual_review.
//
// This is the reversible half of DELETE on the parent route: that one
// permanently deletes listings which were never sold, this one only hides
// them. Re-activating the supplier and re-syncing brings them back.
export async function POST(
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

  const updated = await db
    .update(listing)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(and(eq(listing.supplierId, id), eq(listing.status, "active")))
    .returning({ id: listing.id });

  // Without this the next sync would just switch the listings back on: neither
  // sync path filtered on supplier status before.
  await db
    .update(supplier)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(supplier.id, id));

  return NextResponse.json({
    name: sup.name,
    deactivated: updated.length,
    supplierDeactivated: true,
  });
}
