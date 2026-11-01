import { NextRequest, NextResponse } from "next/server";
import { toApiAmount } from "@/lib/currency";
import { db } from "@/db/drizzle";
import { order, listing } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateApiRequest, ApiErrors } from "@/lib/api-auth";
import { publicSupplierError } from "@/lib/supplier-codename";

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
      metadata: order.metadata,
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
      charge: toApiAmount(o.amount),
      currency: o.currency,
      status: o.status,
      // Why a failed order failed, in plain words (never the supplier's own message).
      error: o.status === "failed" && o.metadata?.error ? publicSupplierError(String(o.metadata.error)) : null,
      created_at: o.createdAt,
    })),
  });
}
