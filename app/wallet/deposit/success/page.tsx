import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { BalanceRefresher } from "./balance-refresher";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DepositSuccessPage() {
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
      <BalanceRefresher />
      <div className="mx-auto max-w-md px-4 py-8 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex size-20 items-center justify-center rounded-full bg-purple-600/20">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={40}
              className="text-purple-300"
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-purple-50">
              Payment submitted
            </h1>
            <p className="mt-2 text-sm text-purple-300/60">
              Your deposit is being processed. Your balance will update
              automatically once the payment is confirmed.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/wallet/deposit">Deposit more</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/marketplace">Go to Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
