"use client";

import { m } from "framer-motion";
import { ScrollReveal, staggerContainer, fadeSlideUp } from "@/components/scroll-reveal";
import { UserPlus, Wallet, ShoppingBag, PackageCheck } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    number: "01",
    title: "Create account",
    description: "Sign up in seconds with just your email. No KYC, no friction.",
  },
  {
    icon: Wallet,
    number: "02",
    title: "Fund wallet",
    description: "Add funds with crypto, bank transfer, or card payment.",
  },
  {
    icon: ShoppingBag,
    number: "03",
    title: "Choose service",
    description: "Browse the marketplace for accounts or pick a growth package.",
  },
  {
    icon: PackageCheck,
    number: "04",
    title: "Receive delivery",
    description: "Get credentials delivered to your dashboard instantly.",
  },
] as const;

const SMOOTH_EASING = [0.22, 1, 0.36, 1] as const;

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-28 font-display">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-px w-2/3 bg-linear-to-r from-transparent via-purple-500/20 to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
            How it works
          </p>
          <h2 className="mx-auto max-w-md text-balance font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            Four steps.{" "}
            <span className="text-gradient-purple">That&apos;s it.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-purple-200/50">
            From sign-up to delivery in minutes. No complicated process.
          </p>
        </ScrollReveal>

        {/* Horizontal timeline on desktop, vertical on mobile */}
        <m.div
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}>
          {STEPS.map((step, i) => (
            <m.div
              key={step.number}
              className="group relative"
              variants={fadeSlideUp}>
              {/* Connector line (hidden on last item) */}
              {i < STEPS.length - 1 && (
                <div className="pointer-events-none absolute right-0 top-8 hidden h-px w-[calc(100%-2rem)] translate-x-[calc(50%+1rem)] bg-linear-to-r from-purple-500/20 to-transparent lg:block" />
              )}

              <div className="glow-card glow-card-hover relative overflow-hidden rounded-2xl border border-purple-500/10 bg-purple-950/20 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/20">
                <div className="mb-4 flex items-center gap-3">
                  <div className="glow-purple-sm flex size-10 items-center justify-center rounded-xl border border-purple-500/20 bg-linear-to-br from-purple-600/20 to-violet-700/10 text-purple-400">
                    <step.icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-purple-500/40">
                    {step.number}
                  </span>
                </div>
                <h3 className="mb-2 font-semibold text-purple-50">{step.title}</h3>
                <p className="text-sm leading-relaxed text-purple-300/50">
                  {step.description}
                </p>
              </div>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
