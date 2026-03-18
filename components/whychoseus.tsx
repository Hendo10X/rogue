"use client";

import { m } from "framer-motion";
import { ScrollReveal, staggerContainer, fadeSlideUp } from "@/components/scroll-reveal";
import { Truck, BadgeCheck, ShieldCheck, Activity, LayoutDashboard } from "lucide-react";

const TRUST_POINTS = [
  {
    icon: Truck,
    title: "Fast automated delivery",
    description: "Orders processed and delivered in minutes, not hours.",
  },
  {
    icon: BadgeCheck,
    title: "Reliable suppliers",
    description: "We only work with vetted, verified sources.",
  },
  {
    icon: ShieldCheck,
    title: "Secure transactions",
    description: "Your payments and data are protected at every step.",
  },
  {
    icon: Activity,
    title: "Real-time tracking",
    description: "Watch your order progress from purchase to delivery.",
  },
  {
    icon: LayoutDashboard,
    title: "Clean dashboard",
    description: "Manage everything in one simple, intuitive interface.",
  },
] as const;

const STATS = [
  { value: "1,000+", label: "Active users" },
  { value: "5,000+", label: "Orders delivered" },
  { value: "99.8%", label: "Satisfaction rate" },
  { value: "<5min", label: "Avg. delivery time" },
] as const;

export default function WhyChooseUs() {
  return (
    <section className="relative py-28 font-display">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-px w-2/3 bg-linear-to-r from-transparent via-purple-500/20 to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
            Why choose us
          </p>
          <h2 className="mx-auto max-w-lg text-balance font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            Trusted by{" "}
            <span className="text-gradient-purple">thousands.</span>
          </h2>
        </ScrollReveal>

        {/* Stats banner */}
        <m.div
          className="glow-card mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-purple-500/10 bg-purple-500/5 backdrop-blur-sm sm:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}>
          {STATS.map((stat) => (
            <m.div
              key={stat.label}
              className="flex flex-col items-center justify-center bg-purple-950/30 px-4 py-8"
              variants={fadeSlideUp}>
              <span className="font-mono text-2xl font-bold text-purple-100 sm:text-3xl">
                {stat.value}
              </span>
              <span className="mt-1 text-xs text-purple-400/60">
                {stat.label}
              </span>
            </m.div>
          ))}
        </m.div>

        {/* Trust points grid - asymmetric 3+2 */}
        <m.div
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}>
          {TRUST_POINTS.map((point) => (
            <m.div
              key={point.title}
              className="flex items-start gap-4 rounded-2xl border border-purple-500/10 bg-purple-950/20 p-5 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/20"
              variants={fadeSlideUp}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/15 bg-purple-900/30 text-purple-400">
                <point.icon className="size-5" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold text-purple-50">{point.title}</h3>
                <p className="text-xs leading-relaxed text-purple-300/50">
                  {point.description}
                </p>
              </div>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
