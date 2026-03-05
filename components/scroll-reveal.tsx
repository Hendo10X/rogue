"use client";

import { m, type Variants } from "framer-motion";

const SMOOTH_EASING = [0.22, 1, 0.36, 1] as const;
const REVEAL_DURATION = 0.7;

export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: REVEAL_DURATION, ease: SMOOTH_EASING },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: REVEAL_DURATION, ease: SMOOTH_EASING },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  amount?: number;
}

export function ScrollReveal({
  children,
  className,
  variants = fadeSlideUp,
  amount = 0.15,
}: ScrollRevealProps) {
  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
      className={className}>
      {children}
    </m.div>
  );
}
