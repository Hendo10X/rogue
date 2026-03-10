import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { formatPriceWithCurrency } from "@/lib/format-price";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { PurchaseButton } from "@/components/marketplace/purchase-button";

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
    <div className="min-h-screen bg-background font-display">
      <DashboardNavbar
        user={{
          id: session.user.id,
          name: session.user.name ?? "User",
          email: session.user.email ?? "",
          image: session.user.image,
        }}
        walletBalance={walletBalance}
      />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground text-sm">
              {listing.platform}
              {listing.categoryName && ` · ${listing.categoryName}`}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold">
              {listing.title}
            </h1>
            <p className="text-muted-foreground text-sm">{listing.supplierName}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground whitespace-pre-wrap text-sm">
              {listing.description?.trim() ? listing.description : "No description"}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-muted-foreground text-sm">Price</p>
              <p className="text-xl font-semibold">
                {formatPriceWithCurrency(listing.price, listing.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">In stock</p>
              <p className="font-medium">{listing.stock}</p>
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
      </main>
    </div>
  );
}
