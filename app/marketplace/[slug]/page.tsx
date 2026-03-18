import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { formatPriceWithCurrency } from "@/lib/format-price";
import { PurchaseButton } from "@/components/marketplace/purchase-button";
import { DashboardShell } from "@/components/dashboard-shell";

async function getListing(slug: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const res = await fetch(`${base}/api/marketplace/listings/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [listing, walletBalance] = await Promise.all([
    getListing(slug),
    (async () => {
      await getOrCreateWallet(session!.user!.id, "NGN");
      const b = await getWalletBalance(session!.user!.id);
      return Array.isArray(b) ? b : [b];
    })(),
  ]);

  if (!listing) {
    notFound();
  }

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
        <div>
          <p className="text-sm text-purple-300/60">
            {listing.platform}
            {listing.categoryName && ` · ${listing.categoryName}`}
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-purple-50">
            {listing.title}
          </h1>
          <p className="text-sm text-purple-300/60">{listing.supplierName}</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-950/30 p-4">
          <p className="whitespace-pre-wrap text-sm text-purple-200/80">
            {listing.description?.trim()
              ? listing.description
              : "No description"}
          </p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-950/30 p-4">
          <div>
            <p className="text-sm text-purple-300/60">Price</p>
            <p className="text-xl font-semibold text-purple-50">
              {formatPriceWithCurrency(listing.price, listing.currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-300/60">In stock</p>
            <p className="font-medium text-purple-50">{listing.stock}</p>
          </div>
        </div>
        <PurchaseButton
          slug={listing.slug}
          price={listing.price}
          currency={listing.currency}
          stock={listing.stock}
          title={listing.title}
          userBalance={
            walletBalance.find((w) => w.currency === "NGN")?.balance ?? "0"
          }
        />
      </div>
    </DashboardShell>
  );
}
