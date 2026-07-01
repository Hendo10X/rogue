import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { order, listing } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateApiRequest, ApiErrors } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/v1/logs/orders — list the API user's log (account) orders.
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  const rows = await db
    .select({
      id: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      quantity: order.quantity,
      createdAt: order.createdAt,
      slug: listing.slug,
      title: listing.title,
      platform: listing.platform,
    })
    .from(order)
    .innerJoin(listing, eq(order.listingId, listing.id))
    .where(eq(order.userId, auth.userId))
    .orderBy(desc(order.createdAt))
    .limit(100);

  return NextResponse.json({
    data: rows.map((o: any) => ({
      order_id: o.id,
      slug: o.slug,
      title: o.title,
      platform: o.platform,
      quantity: o.quantity,
      charge: o.amount,
      currency: o.currency,
      status: o.status,
      created_at: o.createdAt,
    })),
  });
}
