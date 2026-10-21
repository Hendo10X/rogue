import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { DashboardShell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/page-header";
import { ListingGrid } from "@/components/marketplace/listing-grid";

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
        wide
        user={{
          id: session.user.id,
          name: session.user.name ?? "User",
          email: session.user.email ?? "",
          image: session.user.image,
        }}
        walletBalance={walletBalance}
      >
        <PageHeader
          title="Marketplace"
          description="Browse and buy social media accounts and services."
        />
        <ListingGrid walletBalance={walletBalance} />
      </DashboardShell>
  );
}
