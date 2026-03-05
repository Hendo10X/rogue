import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { DepositForm } from "@/components/deposit-form";

export default async function DepositPage() {
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
      <main className="container mx-auto max-w-md px-4 py-12">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold">
              Fund your wallet
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Deposit via crypto (Plisio) or card/bank transfer (Korapay).
              Payments are secure and encrypted.
            </p>
          </div>
          <DepositForm />
        </div>
      </main>
    </div>
  );
}
