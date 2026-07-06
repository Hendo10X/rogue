import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { listing } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

// POST — deactivate every active listing that is out of stock so it disappears
// from the marketplace. Restocked items are reactivated on the next sync.
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await db
    .update(listing)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(and(eq(listing.status, "active"), sql`${listing.stock} <= 0`))
    .returning({ id: listing.id });

  return NextResponse.json({ deactivated: updated.length });
}
