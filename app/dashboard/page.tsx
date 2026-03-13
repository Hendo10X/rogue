import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { db } from "@/db/drizzle";
import { order, listing, supplier, boostingOrder } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { formatPriceWithCurrency } from "@/lib/format-price";
import { getSetting } from "@/lib/admin-auth";
import { AnnouncementBanner } from "@/components/announcement-banner";

export const dynamic = "force-dynamic";

async function getRecentOrders(userId: string) {
  const [marketplaceOrders, boostOrders] = await Promise.all([
    db
      .select({
        id: order.id,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        createdAt: order.createdAt,
        title: listing.title,
      })
      .from(order)
      .innerJoin(listing, eq(order.listingId, listing.id))
      .innerJoin(supplier, eq(listing.supplierId, supplier.id))
      .where(eq(order.userId, userId))
      .orderBy(desc(order.createdAt))
      .limit(5),
    db
      .select({
        id: boostingOrder.id,
        status: boostingOrder.status,
        amount: boostingOrder.amount,
        currency: boostingOrder.currency,
        createdAt: boostingOrder.createdAt,
        title: boostingOrder.serviceName,
      })
      .from(boostingOrder)
      .where(eq(boostingOrder.userId, userId))
      .orderBy(desc(boostingOrder.createdAt))
      .limit(5),
  ]);

  const all = [...marketplaceOrders, ...boostOrders];
  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return all.slice(0, 5);
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [walletBalance, recentOrders, announcementStr] = await Promise.all([
    (async () => {
      await getOrCreateWallet(session!.user!.id, "NGN");
      const b = await getWalletBalance(session!.user!.id);
      return Array.isArray(b) ? b : [b];
    })(),
    getRecentOrders(session.user.id),
    getSetting("site_announcement"),
  ]);

  const primaryBalance = walletBalance.find((w) => w.currency === "NGN") ?? walletBalance[0];
  const announcement = announcementStr ? JSON.parse(announcementStr) : null;

  return (
    <div className="min-h-screen bg-background font-display">
      {announcement?.active && <AnnouncementBanner announcement={announcement} />}
      <DashboardNavbar
        user={{
          id: session.user.id,
          name: session.user.name ?? "User",
          email: session.user.email ?? "",
          image: session.user.image,
        }}
        walletBalance={walletBalance}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <section>
            <h1 className="text-2xl font-semibold">
              Welcome back, {session.user.name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your wallet, orders, and growth services
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-4 shadow-none">
              <p className="text-muted-foreground text-sm">Balance (NGN)</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {primaryBalance
                  ? Number(primaryBalance.balance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}{" "}
                <span className="text-muted-foreground font-normal">NGN</span>
              </p>
              <Link
                href="/wallet/deposit"
                className="text-link mt-2 inline-block text-sm font-medium hover:underline"
              >
                Deposit funds →
              </Link>
            </div>
            <Link
              href="/marketplace"
              className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">Marketplace</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Buy verified social accounts
              </p>
            </Link>
            <Link
              href="/boosting"
              className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">Boosting</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Followers, likes, views & more
              </p>
            </Link>
            <Link
              href="/orders"
              className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">Orders</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Track orders & credentials
              </p>
            </Link>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <Link
                href="/orders"
                className="text-link text-sm font-medium hover:underline"
              >
                View all →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-muted-foreground">
                  No orders yet. Browse the marketplace or boosting to get started.
                </p>
                <Link
                  href="/marketplace"
                  className="text-link mt-2 inline-block text-sm font-medium hover:underline"
                >
                  Go to Marketplace
                </Link>
              </div>
            ) : (
              <>
                <div className="hidden md:block rounded-lg border border-border bg-background">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-3 text-left font-medium">Product</th>
                        <th className="p-3 text-left font-medium">Status</th>
                        <th className="p-3 text-left font-medium">Amount</th>
                        <th className="p-3 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map(
                        (
                          o: {
                            id?: string;
                            title?: string;
                            status?: string;
                            amount?: string;
                            currency?: string;
                            createdAt?: string;
                          }
                        ) => (
                          <tr key={o.id} className="border-b last:border-0">
                            <td className="p-3">{o.title ?? "—"}</td>
                            <td className="p-3 capitalize">{o.status ?? "—"}</td>
                            <td className="p-3">
                              {o.amount ? formatPriceWithCurrency(o.amount, o.currency ?? "NGN") : "—"}
                            </td>
                            <td className="text-muted-foreground p-3">
                              {o.createdAt
                                ? new Date(o.createdAt).toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 md:hidden">
                  {recentOrders.map(
                    (
                      o: {
                        id?: string;
                        title?: string;
                        status?: string;
                        amount?: string;
                        currency?: string;
                        createdAt?: string;
                      }
                    ) => (
                      <div key={o.id} className="rounded-lg border border-border bg-background p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm">{o.title ?? "—"}</p>
                          <span className="text-xs capitalize rounded-full bg-muted px-2 py-0.5">{o.status ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <p className="font-medium">
                            {o.amount ? formatPriceWithCurrency(o.amount, o.currency ?? "NGN") : "—"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
