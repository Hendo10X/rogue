import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { listing } from "@/db/schema";
import { getMarketplacePricing, computeMarketplacePriceNgn } from "@/lib/pricing";
import { getUSDtoNGNRate } from "@/lib/currency";
import { getMarkupNaira } from "@/lib/admin-auth";
import * as socially from "@/lib/boosting/socially";
import { LANDING_PAGES, getLandingBySlug } from "@/lib/landing";
import { SITE_URL } from "@/lib/site";
import { Navbar } from "@/components/navbar";
import Footer from "@/components/Footer";

export const revalidate = 3600; // refresh live inventory hourly
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cfg = getLandingBySlug(slug);
  if (!cfg) return {};
  const url = `${SITE_URL}/buy/${cfg.slug}`;
  return {
    title: cfg.metaTitle,
    description: cfg.metaDescription,
    keywords: cfg.keywords,
    alternates: { canonical: `/buy/${cfg.slug}` },
    openGraph: {
      title: cfg.metaTitle,
      description: cfg.metaDescription,
      url,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: cfg.metaTitle, description: cfg.metaDescription },
  };
}

const ngn = (n: number) => `₦${Math.round(n).toLocaleString("en-US")}`;

interface PreviewItem {
  title: string;
  subtitle: string | null;
  stock: number;
  price: number;
}

async function getAccountPreview(match: string) {
  try {
    const [pricing, rate] = await Promise.all([
      getMarketplacePricing(),
      getUSDtoNGNRate(),
    ]);
    const where = and(
      eq(listing.status, "active"),
      sql`${listing.stock} > 0`,
      sql`((${listing.metadata} ->> 'manual') IS DISTINCT FROM 'true')`,
      sql`(${listing.platform} ILIKE ${`%${match}%`} OR ${listing.categoryName} ILIKE ${`%${match}%`} OR ${listing.title} ILIKE ${`%${match}%`})`,
    );
    const [countRes, rows] = await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
          stock: sql<number>`coalesce(sum(${listing.stock}), 0)::int`,
        })
        .from(listing)
        .where(where),
      db
        .select({
          title: listing.title,
          categoryName: listing.categoryName,
          stock: listing.stock,
          supplierPrice: listing.supplierPrice,
        })
        .from(listing)
        .where(where)
        .orderBy(sql`${listing.supplierPrice} ASC`)
        .limit(12),
    ]);
    const items: PreviewItem[] = rows.map((r: any) => ({
      title: r.title,
      subtitle: r.categoryName,
      stock: r.stock,
      price: computeMarketplacePriceNgn(parseFloat(r.supplierPrice), rate, pricing),
    }));
    return {
      count: countRes[0]?.count ?? 0,
      totalStock: countRes[0]?.stock ?? 0,
      items,
    };
  } catch {
    return { count: 0, totalStock: 0, items: [] as PreviewItem[] };
  }
}

async function getSmmPreview() {
  try {
    const [services, markup] = await Promise.all([
      socially.fetchServices().catch(() => []),
      getMarkupNaira("boosting"),
    ]);
    const byCat = new Map<string, number>();
    for (const s of services) {
      const rate = (parseFloat(s.rate) || 0) + markup;
      const cur = byCat.get(s.category);
      if (cur === undefined || rate < cur) byCat.set(s.category, rate);
    }
    const cats = Array.from(byCat.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 12)
      .map(([category, from]) => ({ category, from }));
    return { count: services.length, cats };
  } catch {
    return { count: 0, cats: [] as { category: string; from: number }[] };
  }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cfg = getLandingBySlug(slug);
  if (!cfg) notFound();

  const accounts = cfg.type === "accounts" ? await getAccountPreview(cfg.match!) : null;
  const smm = cfg.type === "smm" ? await getSmmPreview() : null;

  const related = LANDING_PAGES.filter((p) => p.slug !== cfg.slug);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: cfg.h1,
          item: `${SITE_URL}/buy/${cfg.slug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: cfg.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];
  if (accounts && accounts.items.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: accounts.items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: it.title,
          category: cfg.platformLabel,
          offers: {
            "@type": "Offer",
            price: it.price,
            priceCurrency: "NGN",
            availability: "https://schema.org/InStock",
          },
        },
      })),
    } as any);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-display">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="container mx-auto px-6 pt-10 pb-8 md:pt-16">
          <nav className="text-muted-foreground mb-4 text-sm">
            <Link href="/" className="hover:underline">
              Home
            </Link>{" "}
            / <span className="text-foreground">{cfg.h1}</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {cfg.h1}
          </h1>
          <div className="text-muted-foreground mt-5 max-w-2xl space-y-4 text-base leading-relaxed">
            {cfg.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {(accounts?.count || smm?.count) ? (
            <p className="mt-5 text-sm font-medium text-primary">
              {accounts
                ? `${accounts.count.toLocaleString("en-US")} listings · ${accounts.totalStock.toLocaleString("en-US")} in stock`
                : `${smm!.count.toLocaleString("en-US")} boosting services available`}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Sign up to buy
            </Link>
            <Link
              href={cfg.type === "smm" ? "/boosting" : "/marketplace"}
              className="rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-muted"
            >
              Browse marketplace
            </Link>
          </div>
        </section>

        {/* Live preview */}
        <section className="container mx-auto px-6 py-8">
          <h2 className="mb-4 text-2xl font-semibold">
            {cfg.type === "smm" ? "Popular services" : `${cfg.platformLabel} accounts in stock`}
          </h2>

          {accounts && accounts.items.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.items.map((it, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <p className="line-clamp-2 text-sm font-medium">{it.title}</p>
                  {it.subtitle && (
                    <p className="text-muted-foreground mt-1 text-xs">{it.subtitle}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold">{ngn(it.price)}</span>
                    <span className="text-muted-foreground text-xs">
                      {it.stock.toLocaleString("en-US")} in stock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {smm && smm.cats.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {smm.cats.map((c, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <p className="line-clamp-2 text-sm font-medium">{c.category}</p>
                  <p className="mt-3 font-semibold">
                    from {ngn(c.from)}{" "}
                    <span className="text-muted-foreground text-xs font-normal">/ 1,000</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {((accounts && accounts.items.length === 0) ||
            (smm && smm.cats.length === 0)) && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                Fresh stock is added regularly.{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Create an account
                </Link>{" "}
                to get notified and browse everything.
              </p>
            </div>
          )}
        </section>

        {/* Trust */}
        <section className="container mx-auto px-6 py-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Instant delivery", "Auto-fulfilled orders land in your dashboard within seconds of payment."],
              ["Secure payments", "Pay with crypto (BTC, ETH, USDT) or card & bank transfer. Details never stored."],
              ["Refund or replace", "If delivery fails or doesn't match the listing, you're refunded or replaced."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border p-5">
                <p className="font-medium">{t}</p>
                <p className="text-muted-foreground mt-1 text-sm">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-6 py-8">
          <h2 className="mb-4 text-2xl font-semibold">Frequently asked questions</h2>
          <div className="max-w-3xl space-y-4">
            {cfg.faq.map((f, i) => (
              <div key={i} className="rounded-xl border p-5">
                <p className="font-medium">{f.question}</p>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {f.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="container mx-auto px-6 py-8">
          <h2 className="mb-4 text-2xl font-semibold">More on Rogue Socials</h2>
          <div className="flex flex-wrap gap-3">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/buy/${p.slug}`}
                className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
              >
                {p.h1}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
