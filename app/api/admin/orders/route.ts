import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { order, listing, supplier, user, boostingOrder } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [marketplaceRows, boostingOrders] = await Promise.all([
    db
      .select({
        id: order.id,
        userId: order.userId,
        userEmail: user.email,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        quantity: order.quantity,
        createdAt: order.createdAt,
        title: listing.title,
        supplierName: supplier.name,
      })
      .from(order)
      .innerJoin(listing, eq(order.listingId, listing.id))
      .innerJoin(supplier, eq(listing.supplierId, supplier.id))
      .innerJoin(user, eq(order.userId, user.id))
      .orderBy(desc(order.createdAt))
      .limit(200),
    db
      .select({
        id: boostingOrder.id,
        userId: boostingOrder.userId,
        serviceName: boostingOrder.serviceName,
        link: boostingOrder.link,
        quantity: boostingOrder.quantity,
        amount: boostingOrder.amount,
        status: boostingOrder.status,
        externalOrderId: boostingOrder.externalOrderId,
        createdAt: boostingOrder.createdAt,
      })
      .from(boostingOrder)
      .orderBy(desc(boostingOrder.createdAt))
      .limit(200),
  ]);

  const userMap = new Map<string, string>();
  for (const o of boostingOrders) {
    if (!userMap.has(o.userId)) {
      const [u] = await db
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, o.userId))
        .limit(1);
      userMap.set(o.userId, u?.email ?? "");
    }
  }

  const boostingWithEmail = boostingOrders.map((o) => ({
    ...o,
    type: "boosting",
    userEmail: userMap.get(o.userId) ?? "",
  }));

  const marketplaceOrders = marketplaceRows.map((o) => ({
    ...o,
    type: "marketplace" as const,
  }));
  const allOrders = [
    ...marketplaceOrders.map((o) => ({ ...o, userEmail: o.userEmail })),
    ...boostingWithEmail,
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json(allOrders.slice(0, 200));
}
