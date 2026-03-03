"use client";

import { motion } from "framer-motion";
import { ScrollReveal, staggerContainer, fadeSlideUp } from "@/components/scroll-reveal";

export default function HowItWorks() {
  const steps = [
    { number: "1", title: "Create account", description: "Sign up in seconds—no hassle." },
    { number: "2", title: "Fund wallet", description: "Add funds securely with crypto or card." },
    { number: "3", title: "Choose service", description: "Pick the account or growth package you need." },
    { number: "4", title: "Receive delivery", description: "Get your order delivered fast and safely." },
  ] as const;

  return (
    <section id="how-it-works" className="bg-background @container py-24 font-display">
      <div className="mx-auto max-w-2xl px-6">
        <ScrollReveal className="space-y-4 text-center">
          <h2 className="text-balance text-4xl font-semibold">How it works</h2>
          <p className="text-muted-foreground text-balance">
            Four simple steps. Easy and secure from start to finish.
          </p>
        </ScrollReveal>
        <motion.div
          className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}>
          {steps.map((step) => (
            <motion.div
              key={step.number}
              className="flex gap-4 border-t pt-6"
              variants={fadeSlideUp}>
              <span className="text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full border text-lg font-semibold">
                {step.number}
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
