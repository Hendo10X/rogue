import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { db } from "@/db/drizzle";
import { order, listing, supplier, accountDelivery, boostingOrder } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { OrderList } from "@/components/orders/order-list";
import { DashboardShell } from "@/components/dashboard-shell";

async function getOrders(userId: string) {
  const [marketplaceOrders, boostOrders] = await Promise.all([
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
      .where(eq(order.userId, userId))
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
        link: boostingOrder.link,
      })
      .from(boostingOrder)
      .where(eq(boostingOrder.userId, userId))
      .orderBy(desc(boostingOrder.createdAt))
      .limit(100),
  ]);

  const mapped = [
    ...marketplaceOrders.map((o: typeof marketplaceOrders[number]) => ({
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
    ...boostOrders.map((o: typeof boostOrders[number]) => ({
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
  return mapped;
}

export default async function OrdersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [orders, walletBalance] = await Promise.all([
    getOrders(session.user.id),
    (async () => {
      await getOrCreateWallet(session!.user!.id, "NGN");
      const b = await getWalletBalance(session!.user!.id);
      return Array.isArray(b) ? b : [b];
    })(),
  ]);

  return (
    <DashboardShell
      user={{
        id: session.user.id,
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image,
      }}
      walletBalance={walletBalance}
    >
      <div className="space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-purple-50">Orders</h1>
          <p className="mt-1 text-sm text-purple-300/50">
            Track your orders and view delivery credentials.
          </p>
        </div>
        <OrderList initialOrders={orders} />
      </div>
    </DashboardShell>
  );
}
