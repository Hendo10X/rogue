import { redirect } from "next/navigation";
import { redirectIfSuspended } from "@/lib/suspension";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { DashboardShell } from "@/components/dashboard/shell";
import { isAdminEmail } from "@/lib/admin-emails";
import { PageHeader } from "@/components/page-header";
import { ServiceGrid } from "@/components/boosting/service-grid";

export const dynamic = "force-dynamic";

export default async function BoostingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }
  await redirectIfSuspended(session.user.id);

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
        isAdmin={await isAdminEmail(session.user.email)}
      >
        <PageHeader
          title="Boosting"
          description="Get followers, likes, comments and more for your social media."
        />
        <ServiceGrid walletBalance={walletBalance} />
      </DashboardShell>
  );
}
