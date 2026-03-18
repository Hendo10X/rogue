import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { db } from "@/db/drizzle";
import { order, listing, supplier, boostingOrder } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatPriceWithCurrency } from "@/lib/format-price";
import { DashboardShell } from "@/components/dashboard-shell";

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

  const [walletBalance, recentOrders] = await Promise.all([
    (async () => {
      await getOrCreateWallet(session!.user!.id, "NGN");
      const b = await getWalletBalance(session!.user!.id);
      return Array.isArray(b) ? b : [b];
    })(),
    getRecentOrders(session.user.id),
  ]);

  const primaryBalance = walletBalance.find((w) => w.currency === "NGN") ?? walletBalance[0];

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
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-semibold text-purple-50">
            Welcome back, {session.user.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-purple-300/50">
            Manage your wallet, orders, and growth services
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-purple-500/15 bg-purple-950/30 p-4 shadow-none">
            <p className="text-sm text-purple-300/70">Balance (NGN)</p>
            <p className="mt-1 font-display text-2xl font-semibold text-purple-50">
              {primaryBalance
                ? Number(primaryBalance.balance).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"}{" "}
              <span className="font-normal text-purple-300/60">NGN</span>
            </p>
            <Link
              href="/wallet/deposit"
              className="mt-2 inline-block text-sm font-medium text-purple-300/80 hover:text-purple-100 hover:underline"
            >
              Deposit funds →
            </Link>
          </div>
          <Link
            href="/marketplace"
            className="rounded-xl border border-purple-500/15 bg-purple-950/30 p-4 shadow-none transition hover:bg-purple-950/60"
          >
            <p className="font-medium text-purple-50">Marketplace</p>
            <p className="mt-1 text-sm text-purple-300/60">
              Buy verified social accounts
            </p>
          </Link>
          <Link
            href="/orders"
            className="rounded-xl border border-purple-500/15 bg-purple-950/30 p-4 shadow-none transition hover:bg-purple-950/60"
          >
            <p className="font-medium text-purple-50">Orders</p>
            <p className="mt-1 text-sm text-purple-300/60">
              Track orders &amp; credentials
            </p>
          </Link>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-purple-50">
              Recent Orders
            </h2>
            <Link
              href="/orders"
              className="text-sm font-medium text-purple-300/80 hover:text-purple-100 hover:underline"
            >
              View all →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-purple-500/25 bg-purple-950/20 p-8 text-center">
              <p className="text-sm text-purple-200/70">
                No orders yet. Browse the marketplace or boosting to get started.
              </p>
              <Link
                href="/marketplace"
                className="mt-2 inline-block text-sm font-medium text-purple-300/80 hover:text-purple-100 hover:underline"
              >
                Go to Marketplace
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden rounded-xl border border-purple-500/15 bg-purple-950/30 md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-purple-500/10">
                      <th className="p-3 text-left font-medium text-purple-200/70">
                        Product
                      </th>
                      <th className="p-3 text-left font-medium text-purple-200/70">
                        Status
                      </th>
                      <th className="p-3 text-left font-medium text-purple-200/70">
                        Amount
                      </th>
                      <th className="p-3 text-left font-medium text-purple-200/70">
                        Date
                      </th>
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
                        },
                      ) => (
                        <tr key={o.id} className="border-b border-purple-500/10 last:border-0">
                          <td className="p-3 text-purple-50">
                            {o.title ?? "—"}
                          </td>
                          <td className="p-3 capitalize text-purple-200/80">
                            {o.status ?? "—"}
                          </td>
                          <td className="p-3 text-purple-50">
                            {o.amount
                              ? formatPriceWithCurrency(
                                  o.amount,
                                  o.currency ?? "NGN",
                                )
                              : "—"}
                          </td>
                          <td className="p-3 text-xs text-purple-300/60">
                            {o.createdAt
                              ? new Date(o.createdAt).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      ),
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
                    },
                  ) => (
                    <div
                      key={o.id}
                      className="space-y-2 rounded-xl border border-purple-500/20 bg-purple-950/30 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-purple-50">
                          {o.title ?? "—"}
                        </p>
                        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs capitalize text-purple-200/80">
                          {o.status ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <p className="font-medium text-purple-50">
                          {o.amount
                            ? formatPriceWithCurrency(
                                o.amount,
                                o.currency ?? "NGN",
                              )
                            : "—"}
                        </p>
                        <p className="text-xs text-purple-300/60">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
