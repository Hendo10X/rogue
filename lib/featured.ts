import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { listing, order, supplier } from "@/db/schema";
import { getSetting, setSetting } from "@/lib/admin-auth";
import { getUSDtoNGNRate } from "@/lib/currency";
import { getMarketplacePricing } from "@/lib/pricing";
import { getLogProfits, priceListingNgn } from "@/lib/log-profit";
import { supplierCodename } from "@/lib/supplier-codename";

/** Logs an admin pins to the top of the marketplace (any log, manual or supplier). */
export const MAX_FEATURED = 2;
/** Featured + best sellers shown together. */
export const POPULAR_SLOTS = 6;
const KEY = "featured_listings";
const BEST_SELLER_DAYS = 30;

export async function getFeaturedIds(): Promise<string[]> {
  try {
    const raw = await getSetting(KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, MAX_FEATURED) : [];
  } catch {
    return [];
  }
}

export async function setFeaturedIds(ids: string[]): Promise<string[]> {
  const clean = Array.from(new Set(ids.filter(Boolean))).slice(0, MAX_FEATURED);
  await setSetting(KEY, JSON.stringify(clean));
  return clean;
}

const columns = {
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
};

/**
 * Up to six in-stock logs for the top of the marketplace: the admin's featured
 * picks first, then the best sellers of the last 30 days.
 */
export async function getPopularListings() {
  const featuredIds = await getFeaturedIds();
  const live = and(eq(listing.status, "active"), sql`${listing.stock} > 0`);

  const featuredRows = featuredIds.length
    ? await db
        .select(columns)
        .from(listing)
        .innerJoin(supplier, eq(listing.supplierId, supplier.id))
        .where(and(live, inArray(listing.id, featuredIds)))
    : [];
  // Keep the admin's order.
  featuredRows.sort((a: { id: string }, b: { id: string }) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));

  const since = new Date(Date.now() - BEST_SELLER_DAYS * 24 * 60 * 60 * 1000);
  const sold = sql<number>`sum(${order.quantity})::int`;
  const bestSellers = await db
    .select({ ...columns, sold })
    .from(order)
    .innerJoin(listing, eq(order.listingId, listing.id))
    .innerJoin(supplier, eq(listing.supplierId, supplier.id))
    .where(and(live, eq(order.status, "completed"), gte(order.createdAt, since)))
    .groupBy(listing.id, supplier.name)
    .orderBy(desc(sold))
    .limit(POPULAR_SLOTS + MAX_FEATURED);

  const seen = new Set(featuredRows.map((r: { id: string }) => r.id));
  const rows = [
    ...featuredRows.map((r: (typeof featuredRows)[number]) => ({ ...r, featured: true })),
    ...bestSellers
      .filter((r: { id: string }) => !seen.has(r.id))
      .map((r: (typeof bestSellers)[number]) => ({ ...r, featured: false })),
  ].slice(0, POPULAR_SLOTS);

  const [pricing, rate, profits] = await Promise.all([getMarketplacePricing(), getUSDtoNGNRate(), getLogProfits()]);
  return rows.map(({ metadata, supplierPrice, ...r }) => {
    void supplierPrice;
    return {
      ...r,
      supplierName: supplierCodename(r.supplierName),
      price: String(priceListingNgn({ ...r, supplierPrice, metadata }, rate, pricing, profits)),
      currency: "NGN",
    };
  });
}
