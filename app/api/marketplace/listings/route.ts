import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { listing, supplier } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getUSDtoNGNRate } from "@/lib/currency";
import {
  getMarketplacePricing,
  computeMarketplacePriceNgn,
  capSupplierUsd,
} from "@/lib/pricing";
import { autoSyncIfStale } from "@/lib/suppliers/auto-sync";

export async function GET(req: NextRequest) {
  // Fire-and-forget: sync listings in background if stale (>1hr)
  void autoSyncIfStale();

  try {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const platformGroup = searchParams.get("platformGroup");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const minPrice = parseFloat(searchParams.get("minPrice") ?? "0");
  const maxPrice = parseFloat(searchParams.get("maxPrice") ?? "1000000");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
  const offset = (page - 1) * limit;

  const [pricing, rate] = await Promise.all([
    getMarketplacePricing(),
    getUSDtoNGNRate(),
  ]);

  // Convert NGN price filters to approximate USD supplier-price bounds.
  // Lower bound uses the flat-fee tier, upper bound the percentage tier.
  const minUsd = Math.max(0, (minPrice - pricing.flatFeeNaira) / rate);
  const maxUsd = maxPrice / (1 + pricing.percent / 100) / rate;

  const isManualSql = sql`(${listing.metadata} ->> 'manual' = 'true')`;

  const baseConditions = [eq(listing.status, "active")];
  if (platform) baseConditions.push(eq(listing.platform, platform));
  if (platformGroup === "facebook") baseConditions.push(sql`(${listing.platform} ILIKE '%facebook%')`);
  if (category) baseConditions.push(eq(listing.categoryName, category));

  // Apply price range filter (manual listings carry their own NGN price, so
  // their synthetic supplier price isn't meaningful for the upper bound).
  baseConditions.push(sql`${listing.supplierPrice} >= ${minUsd}`);
  baseConditions.push(
    sql`(${isManualSql} OR ${listing.supplierPrice} <= ${maxUsd})`,
  );

  // Hard price cap: hide auto-synced logs that would still price above the cap
  // ("no log of 500k"). Manual logs are admin-priced, so they're exempt.
  const capUsd = capSupplierUsd(rate, pricing);
  if (capUsd != null) {
    baseConditions.push(
      sql`(${isManualSql} OR ${listing.supplierPrice} <= ${capUsd})`,
    );
  }

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
          metadata: listing.metadata,
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
    ]);

    const itemsWithDynamicPrice = items.map((item: any) => {
      const isManual = !!(item.metadata && item.metadata.manual === true);
      // Manual logs keep their admin-set NGN price; supplier logs use the
      // tiered model (flat fee for cheap logs, % above the threshold).
      const finalPrice = isManual
        ? Math.round(parseFloat(item.price))
        : computeMarketplacePriceNgn(parseFloat(item.supplierPrice), rate, pricing);
      const { metadata, ...rest } = item;
      return {
        ...rest,
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
