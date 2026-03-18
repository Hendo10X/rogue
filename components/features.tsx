"use client";

import { m } from "framer-motion";
import { ScrollReveal, staggerContainer, fadeSlideUp } from "@/components/scroll-reveal";
import { Zap, ShieldCheck, Headphones, BarChart3, Lock, Globe } from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Accounts and growth services delivered to your dashboard within minutes. No delays, no waiting.",
    accent: "from-amber-500/20 to-orange-600/10",
    iconColor: "text-amber-400",
  },
  {
    icon: ShieldCheck,
    title: "Verified Logs",
    description: "Every account is manually verified by our team. Full login credentials, recovery info, and quality checks included.",
    accent: "from-emerald-500/20 to-green-600/10",
    iconColor: "text-emerald-400",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our support team is always online. Get help anytime via Telegram — day or night, we've got you.",
    accent: "from-blue-500/20 to-cyan-600/10",
    iconColor: "text-blue-400",
  },
  {
    icon: BarChart3,
    title: "Real Growth Services",
    description: "Boost followers, likes, and engagement with organic methods across all major platforms.",
    accent: "from-purple-500/20 to-violet-600/10",
    iconColor: "text-purple-400",
  },
  {
    icon: Lock,
    title: "Secure Transactions",
    description: "Pay with crypto or card. All transactions are encrypted and your payment info is never stored.",
    accent: "from-rose-500/20 to-pink-600/10",
    iconColor: "text-rose-400",
  },
  {
    icon: Globe,
    title: "All Platforms",
    description: "Instagram, TikTok, Facebook, X, Telegram, Threads, WhatsApp, and Messenger — all in one place.",
    accent: "from-violet-500/20 to-indigo-600/10",
    iconColor: "text-violet-400",
  },
] as const;

export default function Features() {
  return (
    <section id="features" className="relative py-28 font-display">
      {/* Section glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-px w-2/3 bg-linear-to-r from-transparent via-purple-500/30 to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
            What we offer
          </p>
          <h2 className="mx-auto max-w-xl text-balance font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            Everything you need,{" "}
            <span className="text-gradient-purple">nothing you don&apos;t.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-purple-200/50">
            Premium social media accounts and growth tools — verified, fast, and
            backed by real support.
          </p>
        </ScrollReveal>

        <m.div
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}>
          {FEATURES.map((feature) => (
            <m.div
              key={feature.title}
              className="group glow-card glow-card-hover relative overflow-hidden rounded-2xl border border-purple-500/10 bg-purple-950/20 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/20"
              variants={fadeSlideUp}>
              {/* Corner accent gradient */}
              <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br ${feature.accent} blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />

              <div className={`mb-4 flex size-11 items-center justify-center rounded-xl border border-purple-500/15 bg-purple-900/30 ${feature.iconColor}`}>
                <feature.icon className="size-5" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-purple-50">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-purple-300/50">
                {feature.description}
              </p>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
