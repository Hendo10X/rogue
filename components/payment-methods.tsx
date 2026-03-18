"use client";

import { m } from "framer-motion";
import { ScrollReveal, staggerContainer, fadeSlideUp } from "@/components/scroll-reveal";
import { Bitcoin, CreditCard, Building2 } from "lucide-react";

const METHODS = [
  {
    icon: Bitcoin,
    title: "Bitcoin & Crypto",
    description: "Pay with BTC, ETH, USDT, and other cryptocurrencies. Processed via Plisio for maximum security.",
    badges: ["BTC", "ETH", "USDT"],
  },
  {
    icon: Building2,
    title: "Bank Transfer",
    description: "Direct bank transfers supported via Korapay. Fund your wallet instantly from your bank account.",
    badges: ["NGN", "Direct", "Fast"],
  },
  {
    icon: CreditCard,
    title: "Card Payments",
    description: "Visa, Mastercard, and Verve cards accepted. Secure checkout with encrypted processing.",
    badges: ["Visa", "Mastercard", "Verve"],
  },
] as const;

export default function PaymentMethods() {
  return (
    <section className="relative py-28 font-display">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-px w-2/3 bg-linear-to-r from-transparent via-purple-500/20 to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* Left text */}
          <ScrollReveal>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
              Payments
            </p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Pay however{" "}
              <span className="text-gradient-purple">you want.</span>
            </h2>
            <p className="mt-4 text-purple-200/50 leading-relaxed">
              We support multiple payment methods so you can fund your wallet
              the way that works best for you. All transactions are encrypted
              and your financial data is never stored.
            </p>
          </ScrollReveal>

          {/* Right cards - stacked vertically */}
          <m.div
            className="flex flex-col gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}>
            {METHODS.map((method) => (
              <m.div
                key={method.title}
                className="group glow-card glow-card-hover flex items-start gap-5 rounded-2xl border border-purple-500/10 bg-purple-950/20 p-5 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/20"
                variants={fadeSlideUp}>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-purple-500/15 bg-purple-900/30 text-purple-400">
                  <method.icon className="size-6" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-sm font-semibold text-purple-50">
                    {method.title}
                  </h3>
                  <p className="mb-3 text-xs leading-relaxed text-purple-300/50">
                    {method.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {method.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-purple-500/15 bg-purple-900/40 px-2.5 py-0.5 text-[10px] font-medium text-purple-300/70">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </m.div>
            ))}
          </m.div>
        </div>
      </div>
    </section>
  );
}
