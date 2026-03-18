import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { ListingGrid } from "@/components/marketplace/listing-grid";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  await getOrCreateWallet(session.user.id, "NGN");
  const balance = await getWalletBalance(session.user.id);
  const walletBalance = Array.isArray(balance) ? balance : [balance];

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
          <h1 className="text-2xl font-semibold text-purple-50">
            Marketplace
          </h1>
          <p className="mt-1 text-sm text-purple-300/50">
            Browse and buy social media accounts and services.
          </p>
        </div>
        <ListingGrid walletBalance={walletBalance} />
      </div>
    </DashboardShell>
  );
}
