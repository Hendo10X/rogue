import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { listing, supplier } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getMarkupNaira } from "@/lib/admin-auth";
import { getUSDtoNGNRate } from "@/lib/currency";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [categoriesRows, manualListings] = await Promise.all([
    db
      .selectDistinct({ categoryName: listing.categoryName })
      .from(listing)
      .where(sql`${listing.categoryName} IS NOT NULL`),
    db
      .select({
        id: listing.id,
        title: listing.title,
        platform: listing.platform,
        categoryName: listing.categoryName,
        price: listing.price,
        currency: listing.currency,
        stock: listing.stock,
        status: listing.status,
        metadata: listing.metadata,
      })
      .from(listing)
      .where(sql`${listing.metadata} ->> 'manual' = 'true'`),
  ]);

  const categories = categoriesRows
    .map((r: { categoryName: string | null }) => r.categoryName)
    .filter((c: string | null): c is string => !!c);

  return NextResponse.json({
    categories,
    manualListings,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title: string;
    description?: string;
    platform: string;
    categoryName?: string;
    priceNgn: number;
    stock: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const title = body.title?.trim();
  const platform = body.platform?.trim();
  const priceNgn = Number(body.priceNgn);
  const stock = Number(body.stock);

  if (!title || !platform || !Number.isFinite(priceNgn) || priceNgn <= 0 || !Number.isInteger(stock) || stock <= 0) {
    return NextResponse.json(
      {
        error:
          "title, platform, positive priceNgn and integer stock > 0 are required",
      },
      { status: 400 },
    );
  }

  const [markupNaira, rate] = await Promise.all([
    getMarkupNaira("marketplace"),
    getUSDtoNGNRate(),
  ]);

  // Derive a synthetic supplier price so that existing markup / price
  // calculations keep working for filters and display.
  const supplierPriceUsdRaw = (priceNgn - markupNaira) / rate;
  const supplierPriceUsd = supplierPriceUsdRaw > 0 ? supplierPriceUsdRaw : 0;

  // Ensure a dedicated "Manual" supplier exists
  const manualSlug = "manual";
  let sup = (
    await db
      .select()
      .from(supplier)
      .where(eq(supplier.slug, manualSlug))
      .limit(1)
  )[0];

  if (!sup) {
    const id = crypto.randomUUID();
    await db.insert(supplier).values({
      id,
      name: "Manual",
      slug: manualSlug,
      apiUrl: "manual://local",
      apiKey: "manual",
      status: "active",
      capabilities: { accounts: true },
    });
    sup = (
      await db
        .select()
        .from(supplier)
        .where(eq(supplier.id, id))
        .limit(1)
    )[0];
  }

  const baseSlug = slugify(title);
  let slug = baseSlug || `log-${Date.now()}`;
  let counter = 1;

  // Ensure unique slug
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db
      .select({ id: listing.id })
      .from(listing)
      .where(eq(listing.slug, slug))
      .limit(1);
    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter++}`;
  }

  const listingId = crypto.randomUUID();

  await db.insert(listing).values({
    id: listingId,
    supplierId: sup.id,
    externalProductId: slug,
    type: "account",
    platform,
    categoryName: body.categoryName || null,
    title,
    description: body.description || null,
    slug,
    supplierPrice: String(supplierPriceUsd),
    price: String(priceNgn),
    currency: "NGN",
    stock,
    status: "active",
    metadata: {
      manual: true,
      createdBy: "admin",
    },
  });

  return NextResponse.json({
    ok: true,
    id: listingId,
    slug,
  });
}

