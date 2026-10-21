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
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section >
          <div className="mx-auto w-full max-w-[88rem] px-4 py-16 sm:px-8 sm:py-20">
            <nav className="eyebrow mb-6 flex items-center gap-2 text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <span className="text-primary">{cfg.platformLabel}</span>
            </nav>
            <h1 className="max-w-[18ch] text-4xl leading-[0.98] font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
              {cfg.h1}
            </h1>
            <div className="subtext mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
              {cfg.intro.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {(accounts?.count || smm?.count) ? (
              <p className="eyebrow mt-6 flex items-center gap-2 text-primary">
                <span className="size-1.5 bg-primary" />
                {accounts
                  ? `${accounts.count.toLocaleString("en-US")} listings · ${accounts.totalStock.toLocaleString("en-US")} in stock`
                  : `${smm!.count.toLocaleString("en-US")} boosting services available`}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="eyebrow inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-primary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_14%)]"
              >
                Sign up to buy
              </Link>
              <Link
                href={cfg.type === "smm" ? "/boosting" : "/marketplace"}
                className="eyebrow inline-flex h-11 items-center justify-center rounded-full border bg-input/20 px-6 transition-colors hover:bg-input/50"
              >
                Browse {cfg.type === "smm" ? "boosting" : "marketplace"}
              </Link>
            </div>
          </div>
        </section>

        {/* Live preview */}
        <section >
          <div className="mx-auto w-full max-w-[88rem] px-4 py-16 sm:px-8">
            <div className="mb-8 flex flex-col gap-3">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                {cfg.type === "smm" ? "Popular services" : `${cfg.platformLabel} accounts in stock`}
              </h2>
            </div>

            {accounts && accounts.items.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.items.map((it, i) => (
                  <div key={i} className="flex flex-col justify-between gap-4 surface rounded-2xl p-5">
                    <div>
                      <p className="line-clamp-2 text-sm font-medium">{it.title}</p>
                      {it.subtitle && (
                        <p className="subtext mt-1 text-xs text-muted-foreground">{it.subtitle}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold tabular-nums">{ngn(it.price)}</span>
                      <span className="subtext text-[0.6875rem] text-muted-foreground tabular-nums">
                        {it.stock.toLocaleString("en-US")} in stock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {smm && smm.cats.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {smm.cats.map((c, i) => (
                  <div key={i} className="flex flex-col justify-between gap-4 surface rounded-2xl p-5">
                    <p className="line-clamp-2 text-sm font-medium">{c.category}</p>
                    <p className="text-sm font-semibold tabular-nums">
                      from {ngn(c.from)}{" "}
                      <span className="subtext text-xs font-normal text-muted-foreground">/ 1,000</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {((accounts && accounts.items.length === 0) ||
              (smm && smm.cats.length === 0)) && (
              <div className="surface rounded-2xl px-6 py-12 text-center">
                <p className="subtext text-sm text-muted-foreground">
                  Fresh stock is added regularly.{" "}
                  <Link href="/signup" className="text-primary hover:underline">
                    Create an account
                  </Link>{" "}
                  to get notified and browse everything.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Trust */}
        <section >
          <div className="mx-auto grid w-full max-w-[88rem] px-4 sm:grid-cols-3 sm:px-8">
            {[
              ["Instant delivery", "Auto-fulfilled orders land in your dashboard within seconds of payment."],
              ["Secure payments", "Pay with crypto (BTC, ETH, USDT) or card & bank transfer. Details never stored."],
              ["Refund or replace", "If delivery fails or doesn't match the listing, you're refunded or replaced."],
            ].map(([t, d], i) => (
              <div key={t} className="py-8 last:border-b-0 sm:px-8 sm:first:pl-0 sm:last:border-r-0">
                <span className="eyebrow text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-4 text-sm font-medium">{t}</p>
                <p className="subtext mt-1.5 text-xs leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section >
          <div className="mx-auto grid w-full max-w-[88rem] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Frequently asked questions
              </h2>
            </div>
            <div className="lg:col-span-8">
              {cfg.faq.map((f, i) => (
                <div key={i} className="flex gap-5 py-5">
                  <span className="eyebrow pt-1 text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-base font-medium tracking-[-0.015em]">{f.question}</p>
                    <p className="subtext mt-2 text-sm leading-relaxed text-muted-foreground">
                      {f.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related */}
        <section>
          <div className="mx-auto w-full max-w-[88rem] px-4 py-16 sm:px-8">
            <span className="eyebrow text-muted-foreground">More on Rogue Socials</span>
            <div className="mt-5 flex flex-wrap gap-2">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/buy/${p.slug}`}
                  className="rounded-full bg-white/[0.04] px-4 py-2 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                >
                  {p.h1}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
