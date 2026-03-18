import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { listing, supplier } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getMarkupNaira } from "@/lib/admin-auth";
import { getUSDtoNGNRate } from "@/lib/currency";

export async function GET(req: NextRequest) {
  try {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const platformGroup = searchParams.get("platformGroup");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
  const offset = (page - 1) * limit;

  const [markupNaira, rate] = await Promise.all([
    getMarkupNaira("marketplace"),
    getUSDtoNGNRate(),
  ]);

  const baseConditions = [eq(listing.status, "active")];
  if (platform) baseConditions.push(eq(listing.platform, platform));
  if (platformGroup === "facebook") baseConditions.push(sql`(${listing.platform} ILIKE '%facebook%')`);
  if (category) baseConditions.push(eq(listing.categoryName, category));

  const whereClause =
    baseConditions.length === 1
      ? baseConditions[0]
      : and(...baseConditions);

  const searchFilter = search
    ? and(whereClause, sql`(${listing.title} ILIKE ${`%${search}%`} OR ${listing.description} ILIKE ${`%${search}%`})`)
    : whereClause;

    const [countResult, items] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(listing)
        .innerJoin(supplier, eq(listing.supplierId, supplier.id))
        .where(searchFilter),
      db
        .select({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          supplierPrice: listing.supplierPrice,
          currency: listing.currency,
          stock: listing.stock,
          platform: listing.platform,
          categoryName: listing.categoryName,
          slug: listing.slug,
          supplierName: supplier.name,
        })
        .from(listing)
        .innerJoin(supplier, eq(listing.supplierId, supplier.id))
        .where(searchFilter)
        .orderBy(
          sql`CASE WHEN ${listing.stock} <= 0 THEN 1 ELSE 0 END`,
          sql`CASE WHEN ${supplier.name} ILIKE '%shopviaclone%' THEN 0 ELSE 1 END`,
          desc(listing.createdAt)
        )
        .limit(limit)
        .offset(offset),
      getMarkupNaira("marketplace"),
      getUSDtoNGNRate(),
    ]);

    const itemsWithDynamicPrice = items.map((item: any) => {
      const supplierPrice = parseFloat(item.supplierPrice);
      const finalPrice = Math.round(supplierPrice * rate + markupNaira);
      return {
        ...item,
        price: String(finalPrice),
        currency: "NGN",
      };
    });

  const total = countResult[0]?.count ?? 0;

  const platformsResult = await db
    .selectDistinct({ platform: listing.platform })
    .from(listing)
    .where(eq(listing.status, "active"))
    .orderBy(listing.platform);
  const platforms = platformsResult.map((r: any) => r.platform);

  return NextResponse.json({
    items: itemsWithDynamicPrice,
    platforms,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const causeMsg = err instanceof Error && err.cause instanceof Error ? err.cause.message : "";
    const isConnectionError =
      msg.includes("fetch failed") ||
      msg.includes("ConnectTimeoutError") ||
      msg.includes("connection") ||
      causeMsg.includes("timeout") ||
      causeMsg.includes("Connect");
    return NextResponse.json(
      {
        items: [],
        platforms: [],
        pagination: { page: 1, limit: 24, total: 0, totalPages: 0 },
        error: isConnectionError
          ? "Database connection timed out. Please try again."
          : "Failed to load listings",
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}
