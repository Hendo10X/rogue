import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { listing } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getMarkupNaira, verifyAdminSession } from "@/lib/admin-auth";
import { getUSDtoNGNRate } from "@/lib/currency";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function PATCH(
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

  let body: {
    title?: string;
    platform?: string;
    categoryName?: string | null;
    priceNgn?: number;
    stock?: number;
    status?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(listing)
    .where(
      sql`${listing.id} = ${id} AND ${listing.metadata} ->> 'manual' = 'true'`,
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: "Manual listing not found" },
      { status: 404 },
    );
  }

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    updates.title = body.title.trim();
  }
  if (body.platform !== undefined) {
    updates.platform = body.platform.trim();
  }
  if (body.categoryName !== undefined) {
    updates.categoryName = body.categoryName || null;
  }
  if (body.status !== undefined) {
    updates.status = body.status;
  }
  if (typeof body.stock === "number" && Number.isInteger(body.stock)) {
    updates.stock = body.stock;
  }

  if (typeof body.priceNgn === "number" && body.priceNgn > 0) {
    const [markupNaira, rate] = await Promise.all([
      getMarkupNaira("marketplace"),
      getUSDtoNGNRate(),
    ]);
    const supplierPriceUsdRaw = (body.priceNgn - markupNaira) / rate;
    const supplierPriceUsd = supplierPriceUsdRaw > 0 ? supplierPriceUsdRaw : 0;
    updates.price = String(body.priceNgn);
    updates.currency = "NGN";
    updates.supplierPrice = String(supplierPriceUsd);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await db
    .update(listing)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(listing.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
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

  // Soft-delete: mark as inactive so existing orders remain valid
  await db
    .update(listing)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(
      sql`${listing.id} = ${id} AND ${listing.metadata} ->> 'manual' = 'true'`,
    );

  return NextResponse.json({ ok: true });
}

