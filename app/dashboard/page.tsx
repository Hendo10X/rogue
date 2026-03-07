import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { DashboardNavbar } from "@/components/dashboard-navbar";

async function getOrders(cookie: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const res = await fetch(`${base}/api/orders`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const headersList = await headers();
  const [walletBalance, orders] = await Promise.all([
    (async () => {
      await getOrCreateWallet(session!.user!.id, "USDT");
      const b = await getWalletBalance(session!.user!.id);
      return Array.isArray(b) ? b : [b];
    })(),
    getOrders(headersList.get("cookie") ?? ""),
  ]);

  const primaryBalance = walletBalance.find((w) => w.currency === "NGN") ?? walletBalance[0];
  const recentOrders = Array.isArray(orders) ? orders.slice(0, 5) : [];

  return (
    <div className="min-h-screen bg-background font-display">
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
              <div className="overflow-x-auto rounded-lg border border-border bg-background">
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
                            {o.amount ?? "—"} {o.currency ?? "NGN"}
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
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
