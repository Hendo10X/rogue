import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { DashboardShell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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
        <PageHeader title="Settings" description="Manage your account, password and API keys." />
        <div className="w-full max-w-2xl">
        <SettingsForm
          user={{
            id: session.user.id,
            name: session.user.name ?? "",
            email: session.user.email ?? "",
            image: session.user.image ?? null,
            createdAt: session.user.createdAt?.toString() ?? new Date().toISOString(),
          }}
        />
        </div>
      </DashboardShell>
  );
}
