import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { db } from "@/db/drizzle";
import { order, listing, supplier, accountDelivery, boostingOrder } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { DashboardShell } from "@/components/dashboard/shell";
import { isAdminEmail } from "@/lib/admin-emails";
import { PageHeader } from "@/components/page-header";
import { OrderList } from "@/components/orders/order-list";

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
        isAdmin={isAdminEmail(session.user.email)}
      >
        <PageHeader
          title="Orders"
          description="Track your orders and view delivery credentials."
        />
        <OrderList initialOrders={orders} />
      </DashboardShell>
  );
}
