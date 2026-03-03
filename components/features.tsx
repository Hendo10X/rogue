"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkBadge01Icon,
  Activity01Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import { ScrollReveal, staggerContainer, fadeSlideUp } from "@/components/scroll-reveal";

const FEATURES = [
  {
    icon: CheckmarkBadge01Icon,
    title: "Verified Account Marketplace",
    description:
      "Browse and purchase high-quality, trusted social profiles with safe, automated delivery.",
  },
  {
    icon: Activity01Icon,
    title: "Instant Growth Services",
    description:
      "Increase real followers, likes, and engagement on demand across all major platforms.",
  },
  {
    icon: Calendar03Icon,
    title: "Order Tracking & Crypto Payments",
    description:
      "Track your orders live and pay securely using crypto—with real-time updates and notifications.",
  },
] as const;

export default function Features() {
  return (
    <section id="features" className="bg-background @container pt-12 pb-24">
      <div className="mx-auto max-w-2xl px-6">
        <ScrollReveal className="space-y-4">
          <h2 className="text-balance font-display text-4xl font-semibold">
            Boost Your Social Accounts Instantly
          </h2>
          <p className="text-muted-foreground">
            Buy verified social media accounts or supercharge your profiles with
            real followers, likes, and views—all automated, secure, and
            lightning-fast.
          </p>
        </ScrollReveal>
        <motion.div
          className="@xl:grid-cols-3 mt-12 grid grid-cols-2 gap-6 text-sm"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}>
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              className="space-y-4 border-t pt-6"
              variants={fadeSlideUp}>
              <HugeiconsIcon
                icon={feature.icon}
                size={20}
                className="text-muted-foreground size-5 shrink-0"
              />
              <div className="flex flex-col gap-3">
                <span className="text-foreground font-semibold">
                  {feature.title}
                </span>
                <p className="text-muted-foreground leading-5">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}