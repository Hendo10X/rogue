import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { order, listing, supplier, accountDelivery, boostingOrder } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { boostingProgress, customerBoostingStatus, refreshBoostingOrder } from "@/lib/boosting/refresh";
import { getProxyOrders, toOrderListItem } from "@/lib/proxies/orders";
import { getOtpOrders, toOtpOrderListItem } from "@/lib/otp/orders";
import { supplierCodename } from "@/lib/supplier-codename";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [marketplaceOrders, boostOrdersRaw] = await Promise.all([
    db
      .select({
        id: order.id,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        quantity: order.quantity,
        createdAt: order.createdAt,
        title: listing.title,
        platform: listing.platform,
        slug: listing.slug,
        supplierName: supplier.name,
        deliveryStatus: accountDelivery.deliveryStatus,
        notes: accountDelivery.notes,
      })
      .from(order)
      .innerJoin(listing, eq(order.listingId, listing.id))
      .innerJoin(supplier, eq(listing.supplierId, supplier.id))
      .leftJoin(accountDelivery, eq(order.id, accountDelivery.orderId))
      .where(eq(order.userId, session.user.id))
      .orderBy(desc(order.createdAt))
      .limit(100),
    db
      .select()
      .from(boostingOrder)
      .where(eq(boostingOrder.userId, session.user.id))
      .orderBy(desc(boostingOrder.createdAt))
      .limit(100),
  ]);

  // Refresh recent in-flight boosting orders: progress, plus automatic refunds
  // when the supplier cancels or only partly delivers. Kept small for speed.
  const open = new Set(
    boostOrdersRaw
      .filter((o: (typeof boostOrdersRaw)[number]) => ["pending", "processing"].includes(o.status) && o.externalOrderId != null)
      .slice(0, 8)
      .map((o: (typeof boostOrdersRaw)[number]) => o.id),
  );
  const boostOrders = await Promise.all(
    boostOrdersRaw.map((o: (typeof boostOrdersRaw)[number]) => (open.has(o.id) ? refreshBoostingOrder(o).catch(() => o) : o)),
  );

  const mapped = [
    ...marketplaceOrders.map((o: (typeof marketplaceOrders)[number]) => ({
      id: o.id,
      type: "marketplace" as const,
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      quantity: o.quantity,
      createdAt: o.createdAt,
      title: o.title,
      platform: o.platform,
      slug: o.slug,
      supplierName: supplierCodename(o.supplierName),
      deliveryStatus: (o.deliveryStatus ?? "pending") as string,
      credentials: o.notes ? o.notes.split("\n").filter(Boolean) : [],
    })),
    ...boostOrders.map((o: (typeof boostOrders)[number]) => ({
      id: o.id,
      type: "boosting" as const,
      status: customerBoostingStatus(o),
      amount: o.amount,
      currency: o.currency,
      quantity: o.quantity,
      createdAt: o.createdAt,
      title: o.serviceName,
      platform: (o.category ?? "Boosting") as string,
      slug: "",
      supplierName: "Boosting Service",
      deliveryStatus: o.status === "completed" ? "delivered" : "pending",
      credentials: [] as string[],
      progress: boostingProgress(o),
    })),
  ];

  const [proxyRows, otpRows] = await Promise.all([getProxyOrders(session.user.id), getOtpOrders(session.user.id)]);
  mapped.push(...proxyRows.map(toOrderListItem), ...otpRows.map(toOtpOrderListItem));
  mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(mapped);
}
