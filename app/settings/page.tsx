import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { SettingsForm } from "./settings-form";
import { DashboardShell } from "@/components/dashboard-shell";

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
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-purple-50">Settings</h1>
          <p className="mt-1 text-sm text-purple-300/50">
            Manage your account and preferences.
          </p>
        </div>
        <SettingsForm
          user={{
            id: session.user.id,
            name: session.user.name ?? "",
            email: session.user.email ?? "",
            image: session.user.image ?? null,
            createdAt:
              session.user.createdAt?.toString() ?? new Date().toISOString(),
          }}
        />
      </div>
    </DashboardShell>
  );
}
