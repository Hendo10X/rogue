import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Bitcoin01Icon,
  CreditCardIcon,
  CodeIcon,
  PackageIcon,
  RefreshIcon,
  Rocket01Icon,
  Search01Icon,
  SecurityCheckIcon,
  ShoppingBag01Icon,
  SquareLock01Icon,
  Wallet01Icon,
  CheckmarkCircle02Icon,
  BankIcon,
  FlashIcon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { getSetting } from "@/lib/admin-auth";
import { FAQ_ITEMS } from "@/lib/faq";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Navbar } from "@/components/navbar";
import Footer from "@/components/Footer";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { Stagger, StaggerItem, RevealText } from "@/components/motion/stagger";
import { StorefrontDemo } from "@/components/landing/storefront-demo";
import { DeliveryDemo } from "@/components/landing/delivery-demo";
import { ApiConsole } from "@/components/landing/api-console";
import { Faq } from "@/components/landing/faq";
import { PLATFORMS } from "@/components/landing/platforms";
import { MagneticLink, ScrollSteps, TiltWindow } from "@/components/landing/interactive";

export const dynamic = "force-dynamic";

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

type Icon = typeof PackageIcon;

const STEPS = [
  { icon: Wallet01Icon, title: "Fund your wallet", body: "Top up by card, bank transfer or crypto in seconds." },
  { icon: Search01Icon, title: "Find what you need", body: "Search accounts and services, filter by platform." },
  { icon: ShoppingBag01Icon, title: "Place the order", body: "See the exact total, then pay from your balance." },
  { icon: CheckmarkCircle02Icon, title: "Get delivered", body: "Logins arrive instantly; boosts start in minutes." },
];

export default async function Home() {
  // A settings outage should never take the landing page down with it.
  const announcementStr = await getSetting("site_announcement").catch(() => null);
  const announcement = announcementStr ? JSON.parse(announcementStr) : null;

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      {announcement?.active && <AnnouncementBanner announcement={announcement} />}
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 pt-20 pb-24 sm:px-6 sm:pt-28">
          <div aria-hidden className="glow pointer-events-none absolute inset-x-0 top-0 mx-auto h-[38rem] max-w-5xl opacity-80" />
          <div
            aria-hidden
            className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_55%_45%_at_50%_30%,black,transparent)]"
          />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center text-center">
            <RevealText
              as="h1"
              className="max-w-4xl text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.05em] text-balance sm:text-6xl lg:text-[5.25rem]"
            >
              Buy the account. Boost it.{" "}
              <span className="text-rogue-gradient">Own the feed.</span>
            </RevealText>
            <Stagger className="flex flex-col items-center">
              <StaggerItem>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
                  Aged and fresh accounts with instant delivery, plus followers,
                  likes and views for every major platform — all from one wallet.
                </p>
              </StaggerItem>
              <StaggerItem className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
                <MagneticLink
                  href="/signup"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(100deg,#ff4d1a_0%,#ff7a1a_60%,#ffa51a_100%)] px-7 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_40px_-10px_rgb(255_100_30/0.8)] transition-shadow hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_14px_50px_-8px_rgb(255_110_30/0.9)]"
                >
                  Start growing
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 transition-transform group-hover:translate-x-0.5" />
                </MagneticLink>
                <Button asChild variant="outline" size="lg" className="h-12 px-7">
                  <Link href="/marketplace">Browse the marketplace</Link>
                </Button>
              </StaggerItem>
              <StaggerItem className="mt-10 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {PLATFORMS.slice(0, 6).map((p) => (
                    <span
                      key={p.name}
                      className="flex size-8 items-center justify-center rounded-full bg-[oklch(0.2_0.005_60)] shadow-[0_0_0_2px_var(--background)]"
                    >
                      <Image src={p.src} alt={p.name} width={15} height={15} className="size-[15px]" />
                    </span>
                  ))}
                </div>
                <span className="text-[0.8125rem] text-muted-foreground">8 platforms, one balance</span>
              </StaggerItem>
            </Stagger>
          </div>

          <TiltWindow className="relative mx-auto mt-16 max-w-3xl sm:mt-20">
            <StorefrontDemo />
          </TiltWindow>
        </section>

        {/* Platform ticker */}
        <section
          id="platforms"
          aria-label="Supported platforms"
          className="marquee-group overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
        >
          <div className="animate-marquee flex w-max gap-3">
            {[...PLATFORMS, ...PLATFORMS, ...PLATFORMS, ...PLATFORMS].map((p, i) => (
              <span
                key={i}
                aria-hidden={i >= PLATFORMS.length || undefined}
                className="flex items-center gap-2.5 rounded-full bg-white/[0.03] px-4 py-2 text-[0.8125rem] text-muted-foreground"
              >
                <Image src={p.src} alt="" width={16} height={16} className="size-4" />
                {p.name}
              </span>
            ))}
          </div>
        </section>

        {/* Products — a bento of spotlight cards */}
        <Section id="products">
          <SectionHead
            title="Everything you need to grow."
            sub="Two product lines and a reseller API, all paid from the same balance."
          />
          <Stagger inView className="mt-14 grid gap-3 md:grid-cols-6">
            <StaggerItem className="md:col-span-4">
              <SpotlightCard href="/marketplace" className="flex h-full flex-col p-7">
                <FeatureIcon icon={PackageIcon} />
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em]">Account marketplace</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Aged, fresh, softreg and follower-ready accounts from vetted suppliers, with live
                  stock counts. The login lands in your orders the moment you pay.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {["Aged 2016+", "Softreg", "With followers", "BM / Ads", "Country-specific"].map((t) => (
                    <span key={t} className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-foreground/80">
                      {t}
                    </span>
                  ))}
                </div>
                <CardLink>Open marketplace</CardLink>
              </SpotlightCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-2">
              <SpotlightCard href="/boosting" className="flex h-full flex-col p-7">
                <FeatureIcon icon={Rocket01Icon} />
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em]">Boosting</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Followers, likes, views and comments, priced per 1,000.
                </p>
                <p className="mt-8 text-4xl font-semibold tracking-[-0.04em] tabular-nums">
                  <span className="text-rogue-gradient">₦180</span>
                  <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">/ 1k from</span>
                </p>
                <CardLink>See services</CardLink>
              </SpotlightCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-2">
              <SpotlightCard href="/wallet/deposit" className="flex h-full flex-col p-7">
                <FeatureIcon icon={Wallet01Icon} />
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em]">One wallet</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Fund once, pay from balance. No card declines halfway through checkout.
                </p>
                <div className="mt-8 flex gap-2">
                  {[CreditCardIcon, BankIcon, Bitcoin01Icon].map((ic, i) => (
                    <span key={i} className="flex size-10 items-center justify-center rounded-xl bg-white/[0.05] text-[#ffb27a]">
                      <HugeiconsIcon icon={ic} strokeWidth={1.75} className="size-4.5" />
                    </span>
                  ))}
                </div>
                <CardLink>Fund wallet</CardLink>
              </SpotlightCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-4">
              <SpotlightCard className="h-full overflow-hidden">
                <div className="grid h-full sm:grid-cols-2">
                  <div className="flex flex-col p-7">
                    <FeatureIcon icon={FlashIcon} />
                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em]">Pay, and it&apos;s yours.</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Auto-fulfilled listings hand over the username, password and recovery
                      email the moment payment clears.
                    </p>
                  </div>
                  <div className="sm:pt-2">
                    <DeliveryDemo />
                  </div>
                </div>
              </SpotlightCard>
            </StaggerItem>
          </Stagger>
        </Section>

        {/* How it works */}
        <Section id="how">
          <SectionHead title="Empty wallet to delivered order." sub="Four moves. Most people are done in under a minute." center />
          <div className="mt-16">
            <ScrollSteps steps={STEPS} />
          </div>
        </Section>

        {/* Payments */}
        <Section>
          <SectionHead title="Fund it the way that works for you." sub="Naira, crypto, or a plain bank transfer." />
          <Stagger inView className="mt-14 grid gap-3 md:grid-cols-3">
            <PaymentCard icon={CreditCardIcon} title="Card & bank" body="Pay in NGN through Korapay or Flutterwave — card, transfer or USSD." tag="Korapay · Flutterwave" />
            <PaymentCard icon={Bitcoin01Icon} title="Crypto" body="USDT, BTC or ETH through Plisio, credited automatically on confirmation." tag="Plisio" />
            <PaymentCard icon={BankIcon} title="Manual transfer" body="Pay into the Rogue account, send the receipt on Telegram, and you're credited." tag="Moniepoint" />
          </Stagger>
        </Section>

        {/* API */}
        <Section id="api">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-5">
              <SectionHead title="Plug the whole catalog into your panel." sub="One API key, four endpoints. List services at reseller rates, order against your wallet, poll status." />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/docs/api">
                    Read the docs
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/settings">Get a key</Link>
                </Button>
              </div>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <div className="surface max-w-full overflow-hidden rounded-3xl">
                <ApiConsole />
              </div>
            </div>
          </div>
        </Section>

        {/* Trust */}
        <Section>
          <SectionHead title="Safer than a DM plug." center />
          <Stagger inView className="mt-14 grid gap-3 md:grid-cols-3">
            <TrustCard icon={SquareLock01Icon} title="Private delivery" body="Logins are only visible inside your own order history — never sent over chat." />
            <TrustCard icon={SecurityCheckIcon} title="Vetted suppliers" body="Stock comes from monitored suppliers, and empty listings are pulled automatically." />
            <TrustCard icon={RefreshIcon} title="Refund or replace" body="If delivery fails or doesn't match the listing, you're refunded or replaced." />
          </Stagger>
        </Section>

        {/* FAQ */}
        <Section id="faq">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHead title="Questions, answered." />
              <p className="mt-5 max-w-xs text-sm text-muted-foreground">
                Still stuck?{" "}
                <a
                  href="https://t.me/rogue4l"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline decoration-white/20 underline-offset-4 transition-colors hover:decoration-[#ff8a1a]"
                >
                  Message support on Telegram
                </a>
                .
              </p>
            </div>
            <div className="lg:col-span-8">
              <Faq />
            </div>
          </div>
        </Section>

        {/* CTA */}
        <section className="px-3 pb-6 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-20 text-center sm:py-28">
            <div aria-hidden className="bg-rogue-gradient absolute inset-0 opacity-[0.92]" />
            <div
              aria-hidden
              className="absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)]"
            />
            <div className="relative flex flex-col items-center">
              <RevealText as="h2" className="max-w-2xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance text-white sm:text-6xl">
                Fund a wallet. Pick a platform. Go.
              </RevealText>
              <p className="mt-5 max-w-md text-[0.9375rem] text-white/80">
                Create an account in seconds. No subscription, no fees to join.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-[oklch(0.135_0.004_60)] px-7 text-sm font-medium text-white transition-transform active:scale-[0.97]"
                >
                  Create your account
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center rounded-full bg-white/20 px-7 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/30"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ── Building blocks ─────────────────────────────────────────────────── */

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function SectionHead({ title, sub, center }: { title: string; sub?: string; center?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", center && "items-center text-center")}>
      <RevealText
        as="h2"
        className={cn(
          "max-w-[20ch] text-3xl leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-5xl",
          center && "mx-auto"
        )}
      >
        {title}
      </RevealText>
      {sub && <p className="max-w-lg text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FeatureIcon({ icon }: { icon: Icon }) {
  return (
    <span className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(140deg,rgb(255_90_31/0.22),rgb(255_211_26/0.08))] text-[#ffb27a] shadow-[inset_0_0_0_1px_rgb(255_140_60/0.18)]">
      <HugeiconsIcon icon={icon} strokeWidth={1.75} className="size-5" />
    </span>
  );
}

function CardLink({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-auto flex items-center gap-1.5 pt-8 text-[0.8125rem] text-muted-foreground transition-colors group-hover/spot:text-foreground">
      {children}
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5 transition-transform duration-300 group-hover/spot:translate-x-1" />
    </span>
  );
}

function PaymentCard({ icon, title, body, tag }: { icon: Icon; title: string; body: string; tag: string }) {
  return (
    <StaggerItem>
      <SpotlightCard className="flex h-full flex-col gap-5 p-7">
        <div className="flex items-center justify-between">
          <FeatureIcon icon={icon} />
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[0.6875rem] text-muted-foreground">{tag}</span>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold tracking-[-0.02em]">{title}</h3>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{body}</p>
        </div>
      </SpotlightCard>
    </StaggerItem>
  );
}

function TrustCard({ icon, title, body }: { icon: Icon; title: string; body: string }) {
  return (
    <StaggerItem>
      <div className="flex h-full flex-col gap-4 rounded-2xl bg-white/[0.02] p-7 transition-colors duration-300 hover:bg-white/[0.04]">
        <HugeiconsIcon icon={icon} strokeWidth={1.75} className="size-5 text-[#ff9a4a]" />
        <h3 className="text-[0.9375rem] font-medium tracking-[-0.01em]">{title}</h3>
        <p className="text-[0.8125rem] leading-relaxed text-pretty text-muted-foreground">{body}</p>
      </div>
    </StaggerItem>
  );
}
