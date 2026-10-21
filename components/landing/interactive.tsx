"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

/**
 * An app window that starts tilted back and settles flat as it scrolls up the
 * viewport — the hero's product shot.
 */
export function TiltWindow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 30%"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const rotateX = useTransform(smooth, [0, 1], [18, 0]);
  const scale = useTransform(smooth, [0, 1], [0.94, 1]);

  return (
    <div ref={ref} className={cn("[perspective:1600px]", className)}>
      <motion.div
        style={reduced ? undefined : { rotateX, scale, transformOrigin: "50% 0%" }}
        className="relative rounded-[1.75rem] bg-white/[0.03] p-2 shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_40px_120px_-30px_rgb(255_90_31/0.35)]"
      >
        <div className="surface overflow-hidden rounded-[1.35rem]">
          <div className="flex items-center gap-1.5 px-4 pt-3.5">
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="mx-auto rounded-full bg-white/[0.04] px-3 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
              roguesocials.com/marketplace
            </span>
            <span className="w-10" />
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

type Icon = Parameters<typeof HugeiconsIcon>[0]["icon"];

/**
 * Four steps on a line that fills with the brand gradient as you scroll
 * through the section. Each step lights up as the fill reaches it.
 */
export function ScrollSteps({
  steps,
}: {
  steps: { icon: Icon; title: string; body: string }[];
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => fill.on("change", setProgress), [fill]);

  return (
    <div ref={ref} className="relative">
      {/* Track */}
      <div className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-px bg-white/[0.08] md:block">
        <motion.div className="bg-rogue-gradient h-full origin-left" style={{ scaleX: fill }} />
      </div>
      <ol className="grid gap-4 md:grid-cols-4 md:gap-6">
        {steps.map((s, i) => {
          const lit = progress >= i / steps.length + 0.02 || (i === 0 && progress > 0.01);
          return (
            <li key={s.title} className="flex flex-col items-start gap-4 md:items-center md:text-center">
              <span
                className={cn(
                  "relative flex size-12 items-center justify-center rounded-2xl transition-all duration-500",
                  lit
                    ? "bg-rogue-gradient text-white shadow-[0_8px_30px_-6px_rgb(255_110_30/0.6)]"
                    : "surface text-muted-foreground"
                )}
              >
                <HugeiconsIcon icon={s.icon} strokeWidth={1.75} className="size-5" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[0.9375rem] font-medium tracking-[-0.01em]">{s.title}</h3>
                <p className="max-w-[24ch] text-[0.8125rem] leading-relaxed text-pretty text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A pill CTA whose label nudges toward the cursor — a small magnetic pull. */
export function MagneticLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const reduced = useReducedMotion();

  return (
    <motion.span
      animate={reduced ? undefined : offset}
      transition={{ type: "spring", stiffness: 300, damping: 18, mass: 0.4 }}
      className="inline-flex"
    >
      <Link
        ref={ref}
        href={href}
        onPointerMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          setOffset({
            x: (e.clientX - (r.left + r.width / 2)) * 0.18,
            y: (e.clientY - (r.top + r.height / 2)) * 0.25,
          });
        }}
        onPointerLeave={() => setOffset({ x: 0, y: 0 })}
        className={className}
      >
        {children}
      </Link>
    </motion.span>
  );
}
