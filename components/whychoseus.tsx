"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "framer-motion";
import { ScrollReveal, staggerContainer, fadeSlideUp } from "@/components/scroll-reveal";
import {
  DeliverySent01Icon,
  CheckmarkBadge01Icon,
  DeliverySecure01Icon,
  DeliveryTracking01Icon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons";

const TRUST_POINTS = [
  {
    icon: DeliverySent01Icon,
    title: "Fast automated delivery",
    description: "Get your orders completed quickly. No waiting around.",
  },
  {
    icon: CheckmarkBadge01Icon,
    title: "Reliable suppliers",
    description: "We only work with verified, trusted sources.",
  },
  {
    icon: DeliverySecure01Icon,
    title: "Secure transactions",
    description: "Your payments and data are protected. Always.",
  },
  {
    icon: DeliveryTracking01Icon,
    title: "Real-time order tracking",
    description: "Watch your order progress from start to finish.",
  },
  {
    icon: DashboardSquare01Icon,
    title: "Clean dashboard UI",
    description: "Manage everything easily. No clutter, no confusion.",
  },
] as const;

export default function WhyChooseUs() {
  return (
    <section className="bg-background @container py-24 font-display">
      <div className="mx-auto max-w-2xl px-6">
        <ScrollReveal className="space-y-4 text-center">
          <h2 className="text-balance text-4xl font-semibold">Why choose us</h2>
          <p className="text-muted-foreground text-balance">
            Trusted by thousands. Here&apos;s why you can count on us.
          </p>
        </ScrollReveal>
        <motion.div
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 @xl:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}>
          {TRUST_POINTS.map((point) => (
            <motion.div
              key={point.title}
              className="space-y-4 border-t pt-6"
              variants={fadeSlideUp}>
              <HugeiconsIcon
                icon={point.icon}
                size={20}
                className="text-muted-foreground size-5 shrink-0"
              />
              <div className="flex flex-col gap-3">
                <span className="font-semibold">{point.title}</span>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
