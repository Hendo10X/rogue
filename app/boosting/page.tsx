import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { ServiceGrid } from "@/components/boosting/service-grid";

export default async function BoostingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  await getOrCreateWallet(session.user.id, "USDT");
  const balance = await getWalletBalance(session.user.id);
  const walletBalance = Array.isArray(balance) ? balance : [balance];

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
          <h1 className="font-display text-2xl font-semibold">Boosting</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Get followers, likes, comments and more for your social media
          </p>
        </div>
        <ServiceGrid walletBalance={walletBalance} />
      </main>
    </div>
  );
}
