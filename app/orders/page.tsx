import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { OrderList } from "@/components/orders/order-list";

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

export default async function OrdersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const headersList = await headers();
  const [orders, walletBalance] = await Promise.all([
    getOrders(headersList.get("cookie") ?? ""),
    (async () => {
      await getOrCreateWallet(session!.user!.id, "USDT");
      const b = await getWalletBalance(session!.user!.id);
      return Array.isArray(b) ? b : [b];
    })(),
  ]);

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
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold">Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your orders and view delivery credentials
          </p>
        </div>
        <OrderList initialOrders={orders} />
      </main>
    </div>
  );
}
