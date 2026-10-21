"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion, type Variants } from "motion/react";

// Entrances are system-driven, so they use an expo-out curve (arrive fast,
// settle gently) rather than a spring.
export const EASE = [0.22, 1, 0.36, 1] as const;

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
};

export function Stagger({
  children,
  className,
  inView,
}: {
  children: React.ReactNode;
  className?: string;
  /** Wait until scrolled into view instead of animating on mount. */
  inView?: boolean;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      {...(inView
        ? { whileInView: "show", viewport: { once: true, amount: 0.25 } }
        : { animate: "show" })}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

type Tag = "h1" | "h2" | "h3" | "p";

const TAGS = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
};

/**
 * Masked rise for headlines: the text slides up out of a clip as it scrolls
 * into view. Visibility is read off the clipping wrapper (the text itself
 * starts fully clipped, so it would never count as visible), and the motion is
 * driven by explicit values rather than variant labels so it never gets
 * tangled in a surrounding Stagger's orchestration. Server-rendered as plain
 * text, so it reads fine without JS.
 */
export function RevealText({
  as = "h2",
  children,
  className,
  delay = 0,
}: {
  as?: Tag;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const Comp = TAGS[as];

  return (
    <div ref={ref} className="overflow-hidden pb-[0.08em]">
      <Comp
        className={className}
        initial={reduced ? false : { y: "105%" }}
        animate={inView || reduced ? { y: 0 } : { y: "105%" }}
        transition={{ duration: 0.9, ease: EASE, delay }}
      >
        {children}
      </Comp>
    </div>
  );
}
