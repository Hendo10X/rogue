import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { order, listing, accountDelivery } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { authenticateApiRequest, ApiErrors } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/v1/logs/orders/:id — one log order + its delivered credentials.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  const { id } = await params;
  const [row] = await db
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
    .where(and(eq(order.id, id), eq(order.userId, auth.userId)))
    .limit(1);

  if (!row) return ApiErrors.notFound("Order not found");

  const [delivery] = await db
    .select()
    .from(accountDelivery)
    .where(eq(accountDelivery.orderId, id))
    .limit(1);

  // Only expose credentials once the order is actually delivered.
  const notes =
    delivery?.deliveryStatus === "delivered" ? delivery?.notes ?? "" : "";
  const credentials = notes ? notes.split("\n").filter(Boolean) : [];

  return NextResponse.json({
    data: {
      order_id: row.id,
      slug: row.slug,
      title: row.title,
      platform: row.platform,
      quantity: row.quantity,
      charge: row.amount,
      currency: row.currency,
      status: row.status,
      delivery_status: delivery?.deliveryStatus ?? "pending",
      credentials,
      created_at: row.createdAt,
    },
  });
}
