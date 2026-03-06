import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { order, listing, supplier, accountDelivery } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await db
    .select({
      id: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      quantity: order.quantity,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      title: listing.title,
      platform: listing.platform,
      slug: listing.slug,
      supplierName: supplier.name,
      deliveryStatus: accountDelivery.deliveryStatus,
      deliveredAt: accountDelivery.deliveredAt,
      notes: accountDelivery.notes,
    })
    .from(order)
    .innerJoin(listing, eq(order.listingId, listing.id))
    .innerJoin(supplier, eq(listing.supplierId, supplier.id))
    .leftJoin(accountDelivery, eq(order.id, accountDelivery.orderId))
    .where(eq(order.userId, session.user.id))
    .orderBy(desc(order.createdAt))
    .limit(100);

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      quantity: o.quantity,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      title: o.title,
      platform: o.platform,
      slug: o.slug,
      supplierName: o.supplierName,
      deliveryStatus: o.deliveryStatus ?? "pending",
      deliveredAt: o.deliveredAt,
      credentials: o.notes ? o.notes.split("\n").filter(Boolean) : [],
    }))
  );
}
