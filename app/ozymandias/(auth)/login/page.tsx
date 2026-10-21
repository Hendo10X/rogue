import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShieldKeyIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/logo";
import { getSessionWithAdmin } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

/**
 * Ozymandias has no password of its own: it opens from a Rogue account whose
 * email is on the admin list. Allowed accounts go straight in; everyone else
 * sees why they can't.
 */
export default async function AdminLoginPage() {
  const { session, isAdmin } = await getSessionWithAdmin();
  if (isAdmin) redirect("/api/admin/auth/email");

  return (
    <div className="relative flex h-svh items-center justify-center overflow-hidden p-4">
      <div aria-hidden className="glow pointer-events-none absolute inset-0 m-auto h-96 max-w-2xl opacity-60" />
      <div className="surface relative flex w-full max-w-sm flex-col gap-6 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <Wordmark />
          <span className="flex items-center gap-1.5 rounded-full bg-[#ff7a1a]/12 px-2.5 py-1 text-xs font-medium text-[#ffc08f]">
            <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} className="size-3.5" />
            Ozymandias
          </span>
        </div>

        {session?.user ? (
          <>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-[-0.035em]">No admin access</h1>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground">{session.user.email}</span> isn&apos;t an admin
                account. Sign in with your admin email to continue.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild size="lg">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-[-0.035em]">Admin sign in</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to Rogue with your admin email. Once you&apos;re in, open the panel from
                your dashboard menu.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/login">Sign in to Rogue</Link>
            </Button>
          </>
        )}
        <p className="text-center text-xs text-muted-foreground">Restricted area. Access is logged.</p>
      </div>
    </div>
  );
}
