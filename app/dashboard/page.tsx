import { redirect } from "next/navigation";
import { redirectIfSuspended } from "@/lib/suspension";
import Link from "next/link";
import { headers } from "next/headers";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  CodeIcon,
  Coins01Icon,
  PackageIcon,
  Rocket01Icon,
  ShoppingBag01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { db } from "@/db/drizzle";
import { order, listing, supplier, boostingOrder } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/shell";
import { isAdminEmail } from "@/lib/admin-emails";
import { EmptyState, PageHeader, SectionLabel, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FitText } from "@/components/ui/fit-text";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Price } from "@/components/currency-provider";
import { Badge } from "@/components/ui/badge";
import { getSetting } from "@/lib/admin-auth";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { ReferralCard } from "@/components/referral/referral-card";
import { getReferralSummary } from "@/lib/referral";
import { claimReferralFromRequest } from "@/lib/referral-claim";

export const dynamic = "force-dynamic";

type RecentOrder = {
  id: string;
  kind: "account" | "boost";
  status: string;
  amount: string;
  createdAt: Date;
  title: string;
};

async function getOrders(userId: string) {
  const [marketplaceOrders, boostOrders] = await Promise.all([
    db
      .select({
        id: order.id,
        status: order.status,
        amount: order.amount,
        createdAt: order.createdAt,
        title: listing.title,
      })
      .from(order)
      .innerJoin(listing, eq(order.listingId, listing.id))
      .innerJoin(supplier, eq(listing.supplierId, supplier.id))
      .where(eq(order.userId, userId))
      .orderBy(desc(order.createdAt))
      .limit(100),
    db
      .select({
        id: boostingOrder.id,
        status: boostingOrder.status,
        amount: boostingOrder.amount,
        createdAt: boostingOrder.createdAt,
        title: boostingOrder.serviceName,
      })
      .from(boostingOrder)
      .where(eq(boostingOrder.userId, userId))
      .orderBy(desc(boostingOrder.createdAt))
      .limit(100),
  ]);

  const all: RecentOrder[] = [
    ...marketplaceOrders.map((o: (typeof marketplaceOrders)[number]) => ({ ...o, kind: "account" as const })),
    ...boostOrders.map((o: (typeof boostOrders)[number]) => ({ ...o, kind: "boost" as const })),
  ];
  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return all;
}

function statusVariant(status: string) {
  const s = status.toLowerCase();
  if (s.includes("complet") || s.includes("deliver")) return "default" as const;
  if (s.includes("cancel") || s.includes("fail") || s.includes("refund")) return "destructive" as const;
  return "secondary" as const;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }
  await redirectIfSuspended(session.user.id);

  await claimReferralFromRequest(session.user);

  const [walletBalance, orders, announcementStr, referralSummary] = await Promise.all([
    (async () => {
      await getOrCreateWallet(session!.user!.id, "NGN");
      const b = await getWalletBalance(session!.user!.id);
      return Array.isArray(b) ? b : [b];
    })(),
    getOrders(session.user.id),
    getSetting("site_announcement"),
    getReferralSummary(session.user.id),
  ]);

  const primaryBalance = walletBalance.find((w) => w.currency === "NGN") ?? walletBalance[0];
  const announcement = announcementStr ? JSON.parse(announcementStr) : null;

  const completed = orders.filter((o) => /complet|deliver/i.test(o.status)).length;
  const spent = orders
    .filter((o) => !/cancel|fail|refund/i.test(o.status))
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const recent = orders.slice(0, 6);
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <DashboardShell
      banner={announcement?.active ? <AnnouncementBanner announcement={announcement} /> : undefined}
      user={{
        id: session.user.id,
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image,
      }}
      walletBalance={walletBalance}
      isAdmin={await isAdminEmail(session.user.email)}
    >
      <PageHeader title={`Welcome back, ${firstName}`} description="Here's your wallet and what you've ordered." />

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Balance hero */}
        <div className="relative overflow-hidden rounded-3xl p-7 shadow-[inset_0_0_0_1px_rgb(255_140_60/0.14)] lg:col-span-2">
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,rgb(255_90_31/0.22),rgb(255_211_26/0.06)_55%,transparent_80%)]" />
          <div aria-hidden className="glow absolute -top-24 -right-10 h-72 w-96 opacity-60" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-foreground/70">Wallet balance</span>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                <HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.75} className="size-5" />
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-6">
              {/* One line at any amount: the figure shrinks to fit instead of wrapping. */}
              <p className="min-w-0 flex-1 basis-56 text-5xl leading-none font-semibold tracking-[-0.05em] tabular-nums sm:text-6xl">
                <FitText>
                  <Price ngn={primaryBalance ? primaryBalance.balance : 0} />
                </FitText>
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/wallet/deposit">
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                    Add funds
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/orders">Orders</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <StatCard label="Orders" value={orders.length.toLocaleString()} icon={<HugeiconsIcon icon={ShoppingBag01Icon} />} />
          <StatCard label="Completed" value={completed.toLocaleString()} icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} />} />
          <StatCard label="Spent" value={<Price ngn={spent} />} icon={<HugeiconsIcon icon={Coins01Icon} />} className="col-span-2 sm:col-span-1" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickTile href="/marketplace" icon={PackageIcon} label="Buy accounts" hint="Aged & fresh" />
        <QuickTile href="/boosting" icon={Rocket01Icon} label="Boost a profile" hint="From ₦180 / 1k" />
        <QuickTile href="/wallet/deposit" icon={Wallet01Icon} label="Fund wallet" hint="Card, bank, crypto" />
        <QuickTile href="/settings" icon={CodeIcon} label="API key" hint="For resellers" />
      </div>

      {referralSummary && <ReferralCard data={referralSummary} />}

      {/* Recent orders */}
      <div className="flex flex-col gap-3">
        <SectionLabel
          action={
            <Link href="/orders" className="flex items-center gap-1 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground">
              View all
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          }
        >
          Recent orders
        </SectionLabel>
        {recent.length === 0 ? (
          <EmptyState
            icon={<HugeiconsIcon icon={ShoppingBag01Icon} />}
            title="No orders yet"
            description="Your purchases and boosts will show up here."
            action={
              <Button asChild size="sm" className="mt-2">
                <Link href="/marketplace">Browse the marketplace</Link>
              </Button>
            }
          />
        ) : (
          <ul className="surface flex flex-col gap-0.5 rounded-2xl p-1.5">
            {recent.map((o) => (
              <li key={o.id}>
                <Link
                  href="/orders"
                  className="group flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-muted-foreground transition-colors group-hover:text-[#ff9a4a]">
                      <HugeiconsIcon icon={o.kind === "account" ? PackageIcon : Rocket01Icon} strokeWidth={1.75} className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium">{o.title ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={statusVariant(o.status)} className="hidden sm:inline-flex">
                      {o.status.replace("_", " ")}
                    </Badge>
                    <span className="w-24 text-right text-[0.8125rem] font-medium tabular-nums">
                      {o.amount ? <Price ngn={o.amount} /> : "—"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}

function QuickTile({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: typeof Wallet01Icon;
  label: string;
  hint: string;
}) {
  return (
    <SpotlightCard href={href} className="flex flex-col gap-6 p-5">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(140deg,rgb(255_90_31/0.2),rgb(255_211_26/0.06))] text-[#ffb27a]">
        <HugeiconsIcon icon={icon} strokeWidth={1.75} className="size-[18px]" />
      </span>
      <div>
        <p className="flex items-center gap-1 text-[0.8125rem] font-medium">
          {label}
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover/spot:translate-x-0 group-hover/spot:opacity-100"
          />
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
    </SpotlightCard>
  );
}
