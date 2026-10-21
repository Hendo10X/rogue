import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";
import { DashboardShell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/page-header";
import { DepositForm } from "@/components/deposit-form";

export default async function DepositPage() {
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
        <PageHeader
          title="Fund your wallet"
          description="Top up by card or bank transfer (Korapay, Flutterwave), crypto (Plisio), or a manual bank transfer. Your balance pays for every order."
        />
        <div className="w-full max-w-xl">
          <DepositForm />
        </div>
      </DashboardShell>
  );
}
