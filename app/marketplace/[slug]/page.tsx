import { redirect, notFound } from "next/navigation";
import { redirectIfSuspended } from "@/lib/suspension";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import { Price } from "@/components/currency-provider";
import { DashboardShell } from "@/components/dashboard/shell";
import { isAdminEmail } from "@/lib/admin-emails";
import { PageHeader } from "@/components/page-header";
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
  await redirectIfSuspended(session.user.id);

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
        isAdmin={await isAdminEmail(session.user.email)}
      >
        <PageHeader
          eyebrow={[listing.platform, listing.categoryName].filter(Boolean).join(" · ")}
          title={listing.title}
          description={listing.supplierName}
        />
        <div className="grid w-full max-w-2xl sm:grid-cols-2">
          <div className="surface rounded-2xl px-5 py-5 sm:col-span-2">
            <span className="eyebrow text-muted-foreground">Description</span>
            <p className="subtext mt-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {listing.description?.trim() ? listing.description : "No description"}
            </p>
          </div>
          <div className="surface rounded-2xl px-5 py-4">
            <span className="eyebrow text-muted-foreground">Price</span>
            <p className="mt-2 text-xl font-semibold tracking-[-0.025em] tabular-nums">
              <Price ngn={listing.price} />
            </p>
          </div>
          <div className="surface rounded-2xl px-5 py-4">
            <span className="eyebrow text-muted-foreground">In stock</span>
            <p className="mt-2 text-xl font-semibold tracking-[-0.025em] tabular-nums">
              {Math.round(Number(listing.stock)).toLocaleString("en-US")}
            </p>
          </div>
          <div className="surface rounded-2xl p-4 sm:col-span-2">
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
        </div>
      </DashboardShell>
  );
}
