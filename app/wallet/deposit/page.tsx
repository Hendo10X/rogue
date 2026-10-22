import { redirect } from "next/navigation";
import { redirectIfSuspended } from "@/lib/suspension";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";
import { DashboardShell } from "@/components/dashboard/shell";
import { isAdminEmail } from "@/lib/admin-emails";
import { PageHeader } from "@/components/page-header";
import { DepositForm } from "@/components/deposit-form";
import { getManualFunding } from "@/lib/manual-funding";
import { claimReferralFromRequest } from "@/lib/referral-claim";

export default async function DepositPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }
  await redirectIfSuspended(session.user.id);

  await claimReferralFromRequest(session.user);
  await getOrCreateWallet(session.user.id, "NGN");
  const balance = await getWalletBalance(session.user.id);
  const walletBalance = Array.isArray(balance) ? balance : [balance];
  const manualFunding = await getManualFunding();

  return (
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
        <PageHeader
          title="Fund your wallet"
          description="Top up by card or bank transfer (Korapay, Flutterwave), crypto (Plisio), or a manual bank transfer. Your balance pays for every order."
        />
        <div className="w-full max-w-xl">
          <DepositForm manualFunding={manualFunding} />
        </div>
      </DashboardShell>
  );
}
