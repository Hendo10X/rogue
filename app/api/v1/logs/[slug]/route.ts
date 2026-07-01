import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { listing, supplier } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  authenticateApiRequest,
  getApiMarkupPercent,
  applyApiMarkup,
  ApiErrors,
} from "@/lib/api-auth";
import { getUSDtoNGNRate } from "@/lib/currency";

export const dynamic = "force-dynamic";

// GET /api/v1/logs/:slug — details + reseller price for one log.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  const { slug } = await params;
  const [row] = await db
    .select({
      slug: listing.slug,
      title: listing.title,
      description: listing.description,
      platform: listing.platform,
      category: listing.categoryName,
      stock: listing.stock,
      status: listing.status,
      supplierPrice: listing.supplierPrice,
      metadata: listing.metadata,
      supplierName: supplier.name,
    })
    .from(listing)
    .innerJoin(supplier, eq(listing.supplierId, supplier.id))
    .where(eq(listing.slug, slug))
    .limit(1);

  if (!row) return ApiErrors.notFound("Log not found");

  const isManual = !!(row.metadata && (row.metadata as any).manual === true);
  const [apiMarkup, rate] = await Promise.all([
    getApiMarkupPercent(),
    getUSDtoNGNRate(),
  ]);
  const priceNgn = Math.round(applyApiMarkup(parseFloat(row.supplierPrice), apiMarkup) * rate);

  return NextResponse.json({
    data: {
      slug: row.slug,
      title: row.title,
      description: row.description,
      platform: row.platform,
      category: row.category,
      stock: row.stock,
      price: String(priceNgn),
      currency: "NGN",
      markup_percent: apiMarkup,
      // Manual logs are viewable but can't be bought via the API.
      buyable: !isManual && row.status === "active" && row.stock > 0,
    },
  });
}
