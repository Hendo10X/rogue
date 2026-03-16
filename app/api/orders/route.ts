import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { order, listing, supplier, accountDelivery, boostingOrder } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import * as rss from "@/lib/boosting/really-simple-social";
import * as rp from "@/lib/boosting/reseller-provider";

export const dynamic = "force-dynamic";

function toInternalBoostingStatus(params: {
  supplierStatus?: string;
  remains?: string;
}) {
  const status = (params.supplierStatus ?? "").toLowerCase();
  const remains = params.remains?.trim();

  if (remains === "0" && status.length === 0) return "completed";
  if (status.includes("completed")) return "completed";
  if (status.includes("partial")) return "completed";
  if (status.includes("canceled") || status.includes("cancelled")) return "failed";
  if (status.includes("fail") || status.includes("error")) return "failed";
  if (status.includes("in progress") || status.includes("processing") || status.includes("pending"))
    return "processing";

  return "processing";
}

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
      .select({
        id: boostingOrder.id,
        status: boostingOrder.status,
        amount: boostingOrder.amount,
        currency: boostingOrder.currency,
        quantity: boostingOrder.quantity,
        createdAt: boostingOrder.createdAt,
        serviceName: boostingOrder.serviceName,
        category: boostingOrder.category,
        provider: boostingOrder.provider,
        externalOrderId: boostingOrder.externalOrderId,
      })
      .from(boostingOrder)
      .where(eq(boostingOrder.userId, session.user.id))
      .orderBy(desc(boostingOrder.createdAt))
      .limit(100),
  ]);

  // Refresh statuses for recent in-flight boosting orders so "processing" doesn't stick forever.
  // We keep it small to avoid slowing the page or hitting supplier rate limits.
  const boostOrders = [...boostOrdersRaw];
  const toRefresh = boostOrders
    .filter((o) => (o.status === "processing" || o.status === "pending") && o.externalOrderId != null)
    .slice(0, 8);

  if (toRefresh.length > 0) {
    const refreshed: Array<{
      id: string;
      status: string;
      externalStatus?: string;
      charge?: string;
      startCount?: string;
      remains?: string;
    }> = [];

    for (const o of toRefresh) {
      try {
        const orderId = Number(o.externalOrderId);
        const provider = o.provider === "rp" ? "rp" : "rss";
        const s =
          provider === "rp"
            ? await rp.getOrderStatus(orderId)
            : await rss.getOrderStatus(orderId);

        const nextStatus = toInternalBoostingStatus({
          supplierStatus: s.status,
          remains: s.remains,
        });

        await db
          .update(boostingOrder)
          .set({
            status: nextStatus,
            externalStatus: s.status ?? null,
            charge: s.charge != null ? s.charge : null,
            startCount: s.start_count ?? null,
            remains: s.remains ?? null,
            updatedAt: new Date(),
          })
          .where(eq(boostingOrder.id, o.id));

        refreshed.push({
          id: o.id,
          status: nextStatus,
          externalStatus: s.status,
          charge: s.charge,
          startCount: s.start_count,
          remains: s.remains,
        });
      } catch {
        // non-critical: leave as-is; next poll will try again
      }
    }

    if (refreshed.length > 0) {
      const byId = new Map(refreshed.map((r) => [r.id, r]));
      for (const o of boostOrders) {
        const r = byId.get(o.id);
        if (r) {
          o.status = r.status;
        }
      }
    }
  }

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
      supplierName: o.supplierName,
      deliveryStatus: (o.deliveryStatus ?? "pending") as string,
      credentials: o.notes ? o.notes.split("\n").filter(Boolean) : [],
    })),
    ...boostOrders.map((o: (typeof boostOrders)[number]) => ({
      id: o.id,
      type: "boosting" as const,
      status: o.status,
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
    })),
  ];

  mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(mapped);
}
