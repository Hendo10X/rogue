import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { AuthShell } from "@/components/auth-shell";
import { buttonVariants } from "@/components/ui/button";
import { AutoConnectTelegram } from "@/components/settings/auto-connect-telegram";
import { botUsername } from "@/lib/telegram-bot/api";
import { normaliseCode } from "@/lib/telegram-bot/link";
import { withNext } from "@/lib/safe-next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect Telegram",
  robots: { index: false },
};

/**
 * Where the Telegram bot's "Connect" button lands. Logged in: connects right
 * away. Not logged in: log in or sign up, then you're sent back here and it
 * connects by itself. The bot messages the customer when it's done.
 */
export default async function ConnectTelegramPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code: raw } = await searchParams;
  const code = normaliseCode(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? ""));
  const [session, bot] = await Promise.all([auth.api.getSession({ headers: await headers() }), botUsername()]);
  const botLink = bot ? `https://t.me/${bot}` : null;

  if (code.length !== 8) {
    return (
      <AuthShell title="Connect Telegram" subtitle="This link is incomplete.">
        <p className="text-sm text-muted-foreground">Open the Rogue Socials bot in Telegram and tap Connect again.</p>
        {botLink && (
          <a href={botLink} className={buttonVariants({ className: "mt-4 w-full" })}>
            Open the bot
          </a>
        )}
      </AuthShell>
    );
  }

  const here = `/connect/telegram?code=${code}`;
  if (!session?.user) {
    return (
      <AuthShell title="Connect Telegram" subtitle="Log in or create your free Rogue Socials account. You'll be connected straight after.">
        <div className="flex flex-col gap-3">
          <Link href={withNext("/login", here)} className={buttonVariants({ className: "h-10 w-full" })}>
            Log in
          </Link>
          <Link href={withNext("/signup", here)} className={buttonVariants({ variant: "outline", className: "h-10 w-full" })}>
            Create an account
          </Link>
          <p className="text-center text-xs text-muted-foreground">This link works for 10 minutes. If it expires, tap Connect in the bot again.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Connect Telegram" subtitle={`Signed in as ${session.user.email}`}>
      <AutoConnectTelegram code={code} botLink={botLink} />
    </AuthShell>
  );
}
