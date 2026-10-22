import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserBlock01Icon } from "@hugeicons/core-free-icons";
import { auth } from "@/utils/auth";
import { isUserSuspended } from "@/lib/suspension";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/logo";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Where suspended accounts land. Anyone not suspended is sent on their way. */
export default async function SuspendedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if (!(await isUserSuspended(session.user.id))) redirect("/dashboard");

  return (
    <div className="relative flex h-svh items-center justify-center overflow-hidden p-4">
      <div aria-hidden className="glow pointer-events-none absolute inset-0 m-auto h-96 max-w-2xl opacity-40" />
      <div className="surface relative flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl p-7 text-center">
        <Wordmark />
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
          <HugeiconsIcon icon={UserBlock01Icon} strokeWidth={1.75} className="size-6" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.035em]">Account suspended</h1>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">{session.user.email}</span> can&apos;t place orders or
            deposits right now. If you think this is a mistake, message support.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button asChild size="lg">
            <a href="https://t.me/rogue4l" target="_blank" rel="noopener noreferrer">
              Contact support
            </a>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/">Back to site</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
