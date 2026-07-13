import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { listing } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

// POST — switch a single log on/off in the storefront. Body: { hidden: boolean }.
// Works for ANY listing (supplier-synced or manual). Hiding sets status
// inactive + metadata.hidden=true, which the supplier sync respects so the log
// stays hidden even when restocked. Showing clears the flag and reactivates
// the log if it still has stock.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { hidden?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.hidden !== "boolean") {
    return NextResponse.json(
      { error: "hidden (boolean) is required" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ metadata: listing.metadata, stock: listing.stock })
    .from(listing)
    .where(eq(listing.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  const prevMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const hidden = body.hidden;
  const status = hidden ? "inactive" : existing.stock > 0 ? "active" : "inactive";

  await db
    .update(listing)
    .set({
      status,
      metadata: { ...prevMeta, hidden },
      updatedAt: new Date(),
    })
    .where(eq(listing.id, id));

  return NextResponse.json({ ok: true, id, hidden, status });
}
