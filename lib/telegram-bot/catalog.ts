import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { accountDelivery, listing, order } from "@/db/schema";
import { getUSDtoNGNRate } from "@/lib/currency";
import { capSupplierUsd, getMarketplacePricing } from "@/lib/pricing";
import { getLogProfits, priceListingNgn } from "@/lib/log-profit";

export const PAGE_SIZE = 8;

const isManual = sql`(${listing.metadata} ->> 'manual' = 'true')`;

/** Same visibility rules as the website marketplace, in stock only. */
async function liveWhere() {
  const [pricing, rate] = await Promise.all([getMarketplacePricing(), getUSDtoNGNRate()]);
  const conds = [eq(listing.status, "active"), sql`${listing.stock} > 0`];
  const cap = capSupplierUsd(rate, pricing);
  if (cap != null) conds.push(sql`(${isManual} OR ${listing.supplierPrice} <= ${cap})`);
  return and(...conds);
}

async function pricer() {
  const [pricing, rate, profits] = await Promise.all([getMarketplacePricing(), getUSDtoNGNRate(), getLogProfits()]);
  return (row: { id: string; price: string; supplierPrice: string; metadata?: unknown }) =>
    priceListingNgn(row, rate, pricing, profits);
}

const cols = {
  id: listing.id,
  slug: listing.slug,
  title: listing.title,
  description: listing.description,
  price: listing.price,
  supplierPrice: listing.supplierPrice,
  stock: listing.stock,
  platform: listing.platform,
  metadata: listing.metadata,
};

export type BotListing = { id: string; slug: string; title: string; description: string | null; stock: number; platform: string; priceNgn: number };

/** Platforms that have something in stock, alphabetical. */
export async function getPlatforms(): Promise<string[]> {
  const rows = await db.selectDistinct({ platform: listing.platform }).from(listing).where(await liveWhere());
  return rows.map((r: { platform: string }) => r.platform).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
}

/** One page of in-stock logs for a platform or a search, cheapest first. */
export async function getListings(opts: { platform?: string; search?: string; page: number }): Promise<{ items: BotListing[]; hasMore: boolean }> {
  const conds = [await liveWhere()];
  if (opts.platform) conds.push(eq(listing.platform, opts.platform));
  if (opts.search) conds.push(sql`(${listing.title} ILIKE ${`%${opts.search}%`} OR ${listing.platform} ILIKE ${`%${opts.search}%`})`);
  const [rows, price] = await Promise.all([
    db
      .select(cols)
      .from(listing)
      .where(and(...conds))
      .orderBy(sql`${listing.supplierPrice}::numeric`, desc(listing.createdAt))
      .limit(PAGE_SIZE + 1)
      .offset(opts.page * PAGE_SIZE),
    pricer(),
  ]);
  const items = rows.slice(0, PAGE_SIZE).map((r: (typeof rows)[number]) => toBot(r, price));
  return { items, hasMore: rows.length > PAGE_SIZE };
}

export async function getListing(id: string): Promise<BotListing | null> {
  const [[row], price] = await Promise.all([db.select(cols).from(listing).where(eq(listing.id, id)).limit(1), pricer()]);
  return row ? toBot(row, price) : null;
}

function toBot(
  r: { id: string; slug: string; title: string; description: string | null; stock: number; platform: string; price: string; supplierPrice: string; metadata: unknown },
  price: (row: { id: string; price: string; supplierPrice: string; metadata?: unknown }) => number,
): BotListing {
  return { id: r.id, slug: r.slug, title: r.title, description: r.description, stock: r.stock, platform: r.platform, priceNgn: price(r) };
}

/** A customer's latest log orders. */
export async function getRecentOrders(userId: string) {
  return db
    .select({ id: order.id, status: order.status, amount: order.amount, quantity: order.quantity, createdAt: order.createdAt, title: listing.title })
    .from(order)
    .innerJoin(listing, eq(order.listingId, listing.id))
    .where(eq(order.userId, userId))
    .orderBy(desc(order.createdAt))
    .limit(8);
}

/** The delivered login details of one of the customer's orders. */
export async function getOrderDetails(userId: string, orderId: string) {
  const [row] = await db
    .select({ status: order.status, title: listing.title, notes: accountDelivery.notes, quantity: order.quantity })
    .from(order)
    .innerJoin(listing, eq(order.listingId, listing.id))
    .leftJoin(accountDelivery, eq(accountDelivery.orderId, order.id))
    .where(and(eq(order.id, orderId), eq(order.userId, userId)))
    .limit(1);
  return row ?? null;
}
