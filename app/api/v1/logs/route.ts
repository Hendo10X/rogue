import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { listing, supplier } from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import {
  authenticateApiRequest,
  getApiMarkupPercent,
  applyApiMarkup,
  ApiErrors,
} from "@/lib/api-auth";
import { getUSDtoNGNRate } from "@/lib/currency";

export const dynamic = "force-dynamic";

// GET /api/v1/logs — list marketplace accounts ("logs") buyable via the API.
// Only auto-fulfilled, in-stock, non-manual listings are returned.
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  const [apiMarkup, rate] = await Promise.all([
    getApiMarkupPercent(),
    getUSDtoNGNRate(),
  ]);

  const conds = [
    eq(listing.status, "active"),
    sql`${listing.stock} > 0`,
    // Exclude manual-delivery logs — the API only sells auto-fulfilled ones.
    sql`((${listing.metadata} ->> 'manual') IS DISTINCT FROM 'true')`,
  ];
  if (platform) conds.push(eq(listing.platform, platform));
  if (category) conds.push(eq(listing.categoryName, category));
  if (search) {
    conds.push(
      sql`(${listing.title} ILIKE ${`%${search}%`} OR ${listing.description} ILIKE ${`%${search}%`})`,
    );
  }
  const where = and(...conds);

  const [countRes, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(listing).where(where),
    db
      .select({
        slug: listing.slug,
        title: listing.title,
        description: listing.description,
        platform: listing.platform,
        category: listing.categoryName,
        stock: listing.stock,
        supplierPrice: listing.supplierPrice,
      })
      .from(listing)
      .innerJoin(supplier, eq(listing.supplierId, supplier.id))
      .where(where)
      .orderBy(desc(listing.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const items = rows.map((r: any) => {
    const cost = parseFloat(r.supplierPrice);
    const priceNgn = Math.round(applyApiMarkup(cost, apiMarkup) * rate);
    return {
      slug: r.slug,
      title: r.title,
      description: r.description,
      platform: r.platform,
      category: r.category,
      stock: r.stock,
      price: String(priceNgn),
      currency: "NGN",
      markup_percent: apiMarkup,
    };
  });

  const total = countRes[0]?.count ?? 0;
  return NextResponse.json({
    data: items,
    count: items.length,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
}
