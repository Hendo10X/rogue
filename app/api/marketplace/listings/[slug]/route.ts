import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { listing, supplier } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [row] = await db
    .select({
      id: listing.id,
      externalProductId: listing.externalProductId,
      supplierId: listing.supplierId,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      supplierPrice: listing.supplierPrice,
      currency: listing.currency,
      stock: listing.stock,
      platform: listing.platform,
      categoryName: listing.categoryName,
      metadata: listing.metadata,
      supplierName: supplier.name,
      supplierSlug: supplier.slug,
    })
    .from(listing)
    .innerJoin(supplier, eq(listing.supplierId, supplier.id))
    .where(eq(listing.slug, slug))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}
