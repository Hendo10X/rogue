import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { DashboardShell } from "@/components/dashboard/shell";
import { isAdminEmail } from "@/lib/admin-emails";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { BalanceRefresher } from "./balance-refresher";

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
    <>
      <BalanceRefresher />
      <DashboardShell
        user={{
          id: session.user.id,
          name: session.user.name ?? "User",
          email: session.user.email ?? "",
          image: session.user.image,
        }}
        walletBalance={walletBalance}
        isAdmin={await isAdminEmail(session.user.email)}
      >
        <div className="flex w-full max-w-md flex-col surface rounded-2xl">
          <div className="flex items-center gap-3 px-5 py-4">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={1.75}
              className="size-5 text-primary"
            />
          </div>
          <div className="px-5 py-6">
            <h1 className="text-xl font-semibold tracking-[-0.03em]">
              Your deposit is on its way.
            </h1>
            <p className="subtext mt-2 text-sm text-muted-foreground">
              We&apos;re confirming the payment. Your balance updates
              automatically the moment it clears.
            </p>
          </div>
          <div className="grid grid-cols-2">
            <Button asChild variant="ghost" className="eyebrow h-11">
              <Link href="/wallet/deposit">Deposit more</Link>
            </Button>
            <Button asChild className="eyebrow h-11">
              <Link href="/marketplace">Go to marketplace</Link>
            </Button>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
