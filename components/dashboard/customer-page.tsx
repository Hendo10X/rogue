import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { redirectIfSuspended } from "@/lib/suspension";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { isAdminEmail } from "@/lib/admin-emails";
import { DashboardShell } from "@/components/dashboard/shell";

/** Signed-in customer page inside the dashboard shell (redirects otherwise). */
export async function CustomerPage({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  await redirectIfSuspended(session.user.id);

  await getOrCreateWallet(session.user.id, "NGN");
  const balance = await getWalletBalance(session.user.id);
  const walletBalance = Array.isArray(balance) ? balance : [balance];

  return (
    <DashboardShell
      wide={wide}
      user={{
        id: session.user.id,
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image,
      }}
      walletBalance={walletBalance}
      isAdmin={await isAdminEmail(session.user.email)}
    >
      {children}
    </DashboardShell>
  );
}
