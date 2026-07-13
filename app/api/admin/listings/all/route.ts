import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { listing } from "@/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
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
  const whereExpr = and(...conds);

  const [rows, [{ count }], platformRows] = await Promise.all([
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

  const items = rows.map(
    (r: {
      id: string;
      title: string;
      platform: string;
      categoryName: string | null;
      price: string;
      currency: string;
      stock: number;
      status: string;
      metadata: Record<string, unknown> | null;
    }) => ({
      id: r.id,
      title: r.title,
      platform: r.platform,
      categoryName: r.categoryName,
      price: r.price,
      currency: r.currency,
      stock: r.stock,
      status: r.status,
      hidden: r.metadata?.hidden === true,
    }),
  );

  const platforms = platformRows
    .map((p: { platform: string }) => p.platform)
    .filter(Boolean)
    .sort();

  const total = Number(count);
  return NextResponse.json({
    items,
    platforms,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
