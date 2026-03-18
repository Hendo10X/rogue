import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";
import { DepositForm } from "@/components/deposit-form";
import { DashboardShell } from "@/components/dashboard-shell";

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
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-purple-50">
            Fund your wallet
          </h1>
          <p className="mt-2 text-sm text-purple-300/50">
            Deposit via crypto (Plisio) or card/bank transfer (Korapay).
            Payments are secure and encrypted.
          </p>
        </div>
        <DepositForm />
      </div>
    </DashboardShell>
  );
}
