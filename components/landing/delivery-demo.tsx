"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

const TICK = 100;
const RUN = 2800;
const HOLD = 1800;

const STAGES = [
  { at: 0, label: "Listing picked" },
  { at: 800, label: "Paid from wallet" },
  { at: 1600, label: "Login delivered" },
];

const SECRET = [
  ["Username", "rogue.lion.2016"],
  ["Password", "Kx7!m2Qp9vLz"],
  ["Email", "lion2016@mail.com"],
];

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!#$%";

/** Scrambles toward the real string as `progress` goes 0 → 1. */
function scramble(text: string, progress: number, seed: number) {
  const revealed = Math.floor(text.length * progress);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += i < revealed ? text[i] : GLYPHS[(i * 7 + seed * 13) % GLYPHS.length];
  }
  return out;
}

/**
 * A live order: a timer runs, three steps tick on, and the login decodes in
 * place. It only plays while it is on screen.
 */
export function DeliveryDemo() {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (reduced || !inView) return;
    const timer = window.setInterval(() => {
      setElapsed((e) => (e >= RUN + HOLD ? 0 : e + TICK));
    }, TICK);
    return () => window.clearInterval(timer);
  }, [reduced, inView]);

  const clamped = reduced ? RUN : Math.min(elapsed, RUN);
  const reached = STAGES.map((s) => clamped >= s.at);
  const progress = clamped / RUN;
  const decode = Math.max(0, Math.min(1, (clamped - 1600) / (RUN - 1600)));

  return (
    <div ref={ref} className="flex w-full flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white/[0.05]">
          <Image src="/svgs/instagram-icon.svg" alt="" width={20} height={20} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Instagram · Aged 2016 · USA</p>
          <p className="text-xs text-muted-foreground">₦9,500 · auto-delivered</p>
        </div>
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 font-mono text-xs text-[#ffb27a] tabular-nums">
          {(clamped / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Progress */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="bg-rogue-gradient h-full origin-left rounded-full"
          animate={{ scaleX: progress }}
          transition={{ duration: elapsed === 0 ? 0 : TICK / 1000, ease: "linear" }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STAGES.map((stage, i) => (
          <span
            key={stage.label}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all duration-300",
              reached[i] ? "bg-[#ff7a1a]/12 text-[#ffc08f]" : "bg-white/[0.03] text-muted-foreground/60"
            )}
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              className={cn("size-3.5 transition-transform duration-300", reached[i] ? "scale-100" : "scale-75 opacity-50")}
            />
            {stage.label}
          </span>
        ))}
      </div>

      <dl className="flex flex-col gap-1 rounded-xl bg-black/30 p-2 font-mono text-xs">
        {SECRET.map(([k, v], i) => (
          <div key={k} className="flex items-center gap-4 rounded-lg px-2.5 py-2">
            <dt className="w-20 shrink-0 font-sans text-muted-foreground">{k}</dt>
            <dd className={cn("truncate transition-colors", decode >= 1 ? "text-foreground" : "text-muted-foreground/70")}>
              {decode > 0 ? scramble(v, decode, Math.floor(clamped / TICK) + i) : "•".repeat(v.length)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
