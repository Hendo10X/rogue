import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { listing } from "@/db/schema";
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { getUSDtoNGNRate } from "@/lib/currency";
import { getMarketplacePricing } from "@/lib/pricing";
import { getLogProfits, priceListingNgn, setLogProfits } from "@/lib/log-profit";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

// GET — list every marketplace log (across all suppliers), paginated, so the
// admin can find one and switch it off. Filters: ?q= (title), ?platform=,
// ?status=active|inactive|all, ?hiddenOnly=1, ?page=, ?limit=.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const platform = searchParams.get("platform")?.trim();
  const status = searchParams.get("status") ?? "all";
  const hiddenOnly = searchParams.get("hiddenOnly") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
  );
  const offset = (page - 1) * limit;

  const conds = [sql`true`];
  if (q) conds.push(ilike(listing.title, `%${q}%`));
  if (platform && platform !== "all") conds.push(eq(listing.platform, platform));
  if (status === "active") conds.push(eq(listing.status, "active"));
  else if (status === "inactive") conds.push(eq(listing.status, "inactive"));
  if (hiddenOnly) conds.push(sql`${listing.metadata} ->> 'hidden' = 'true'`);
  const profits = await getLogProfits();
  if (searchParams.get("customOnly") === "1") {
    const ids = Array.from(profits.keys());
    conds.push(ids.length ? inArray(listing.id, ids) : sql`false`);
  }
  const whereExpr = and(...conds);

  const [rows, [{ count }], platformRows] = await Promise.all([
    db
      .select({
        id: listing.id,
        title: listing.title,
        platform: listing.platform,
        categoryName: listing.categoryName,
        price: listing.price,
        supplierPrice: listing.supplierPrice,
        currency: listing.currency,
        stock: listing.stock,
        status: listing.status,
        metadata: listing.metadata,
      })
      .from(listing)
      .where(whereExpr)
      .orderBy(desc(listing.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .where(whereExpr),
    db.selectDistinct({ platform: listing.platform }).from(listing),
  ]);

  const [pricing, rate] = await Promise.all([getMarketplacePricing(), getUSDtoNGNRate()]);
  const items = rows.map(
    (r: {
      id: string;
      title: string;
      platform: string;
      categoryName: string | null;
      price: string;
      supplierPrice: string;
      currency: string;
      stock: number;
      status: string;
      metadata: Record<string, unknown> | null;
    }) => {
      const manual = r.metadata?.manual === true;
      return {
        id: r.id,
        title: r.title,
        platform: r.platform,
        categoryName: r.categoryName,
        // What customers pay right now (same rule as the store).
        price: String(priceListingNgn(r, rate, pricing, profits)),
        costNgn: manual ? null : Math.round((parseFloat(r.supplierPrice) || 0) * rate),
        profit: profits.get(r.id) ?? null,
        manual,
        currency: r.currency,
        stock: r.stock,
        status: r.status,
        hidden: r.metadata?.hidden === true,
      };
    },
  );

  const platforms = platformRows
    .map((p: { platform: string }) => p.platform)
    .filter(Boolean)
    .sort();

  const total = Number(count);
  return NextResponse.json({
    items,
    platforms,
    customCount: profits.size,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// PATCH — bulk changes.
//   { ids: string[], hidden: boolean }        hide / show many logs (same rules as one)
//   { ids: string[], profit: number | null }  set or clear their profit (₦, supplier logs)
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { ids?: unknown; hidden?: unknown; profit?: unknown }
    | null;
  const ids = Array.isArray(body?.ids)
    ? (body!.ids as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  if (ids.length === 0 || ids.length > 500) {
    return NextResponse.json({ error: "Select between 1 and 500 logs." }, { status: 400 });
  }

  if (typeof body?.hidden === "boolean") {
    // Same as the single toggle: hiding sets inactive + metadata.hidden (the
    // supplier sync respects it); showing clears it and reactivates if stocked.
    if (body.hidden) {
      await db
        .update(listing)
        .set({
          status: "inactive",
          metadata: sql`coalesce(${listing.metadata}, '{}'::jsonb) || '{"hidden": true}'::jsonb`,
          updatedAt: new Date(),
        })
        .where(inArray(listing.id, ids));
    } else {
      await db
        .update(listing)
        .set({
          status: sql`case when ${listing.stock} > 0 then 'active' else 'inactive' end`,
          metadata: sql`coalesce(${listing.metadata}, '{}'::jsonb) || '{"hidden": false}'::jsonb`,
          updatedAt: new Date(),
        })
        .where(inArray(listing.id, ids));
    }
    return NextResponse.json({ ok: true });
  }

  if (body && "profit" in body) {
    const profit = body.profit === null ? null : Number(body.profit);
    if (profit !== null && (!Number.isFinite(profit) || profit < 0 || profit > 10_000_000)) {
      return NextResponse.json({ error: "Profit must be ₦0 or more." }, { status: 400 });
    }
    const map = await setLogProfits(ids, profit);
    return NextResponse.json({ ok: true, customCount: map.size });
  }

  return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
}
