"use client";

import * as React from "react";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PackageIcon, Rocket01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const DWELL = 3400;

type Row = { name: string; kind: "Account" | "Boost"; price: number; unit: string; stock?: number };

const BOARDS: { platform: string; src: string; rows: Row[] }[] = [
  {
    platform: "Instagram",
    src: "/svgs/instagram-icon.svg",
    rows: [
      { name: "Aged 2016 · USA", kind: "Account", price: 9500, unit: "each", stock: 42 },
      { name: "Softreg · 2FA on", kind: "Account", price: 2200, unit: "each", stock: 180 },
      { name: "Followers · Nigeria", kind: "Boost", price: 3400, unit: "per 1k" },
      { name: "Reel views", kind: "Boost", price: 260, unit: "per 1k" },
    ],
  },
  {
    platform: "TikTok",
    src: "/svgs/tiktok-icon-dark.svg",
    rows: [
      { name: "Aged · UK", kind: "Account", price: 6800, unit: "each", stock: 27 },
      { name: "1k+ followers", kind: "Account", price: 14500, unit: "each", stock: 9 },
      { name: "Views", kind: "Boost", price: 180, unit: "per 1k" },
      { name: "Likes", kind: "Boost", price: 950, unit: "per 1k" },
    ],
  },
  {
    platform: "Facebook",
    src: "/svgs/facebook-icon.svg",
    rows: [
      { name: "Aged · can create pages", kind: "Account", price: 7200, unit: "each", stock: 64 },
      { name: "BM / Ads ready", kind: "Account", price: 18000, unit: "each", stock: 12 },
      { name: "Page likes", kind: "Boost", price: 2900, unit: "per 1k" },
      { name: "Post reactions", kind: "Boost", price: 1100, unit: "per 1k" },
    ],
  },
  {
    platform: "X",
    src: "/svgs/x_dark.svg",
    rows: [
      { name: "Aged · empty", kind: "Account", price: 4300, unit: "each", stock: 55 },
      { name: "With followers", kind: "Account", price: 11500, unit: "each", stock: 18 },
      { name: "Followers", kind: "Boost", price: 5200, unit: "per 1k" },
      { name: "Impressions", kind: "Boost", price: 140, unit: "per 1k" },
    ],
  },
];

/**
 * The store, as an app window: a platform switcher that steps on its own
 * (hover pauses it), rows that cross-fade on a stagger, prices that roll to
 * their new figure, and a soft highlight that follows the hovered row.
 */
export function StorefrontDemo({ className }: { className?: string }) {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setActive((i) => (i + 1) % BOARDS.length), DWELL);
    return () => window.clearTimeout(timer);
  }, [active, paused]);

  const board = BOARDS[active];
  const d = reduced ? 0 : 1;

  return (
    <div
      className={cn("w-full", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setHovered(null);
      }}
    >
      {/* Search + platform switcher */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex h-9 items-center gap-2 rounded-xl bg-white/[0.04] px-3 text-[0.8125rem] text-muted-foreground shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] sm:w-56">
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-3.5" />
          <span className="truncate">Search {board.platform}…</span>
        </div>
        <div className="inline-flex items-center gap-0.5 self-start rounded-full bg-white/[0.04] p-1 sm:self-auto">
          {BOARDS.map((b, i) => {
            const on = i === active;
            return (
              <button
                key={b.platform}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={on}
                aria-label={b.platform}
                className="relative flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium"
              >
                {on && (
                  <motion.span
                    layoutId="store-tab"
                    className="absolute inset-0 rounded-full bg-white/[0.1]"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <Image
                  src={b.src}
                  alt=""
                  width={14}
                  height={14}
                  className={cn("relative size-3.5 transition-[filter,opacity] duration-200", !on && "opacity-50 grayscale")}
                />
                <span className={cn("relative hidden md:inline", on ? "text-foreground" : "text-muted-foreground")}>
                  {b.platform}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      <div className="relative px-2 pb-2">
        {board.rows.map((row, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            className="relative flex h-14 items-center gap-3 rounded-xl px-3"
          >
            {hovered === i && (
              <motion.span
                layoutId="store-row"
                className="absolute inset-0 rounded-xl bg-white/[0.045]"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center rounded-lg",
                row.kind === "Account" ? "bg-[#ff7a1a]/12 text-[#ffb27a]" : "bg-[#ffd31a]/10 text-[#ffe27a]"
              )}
            >
              <HugeiconsIcon icon={row.kind === "Account" ? PackageIcon : Rocket01Icon} strokeWidth={1.75} className="size-4" />
            </span>
            <div className="relative h-9 min-w-0 flex-1 overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={board.platform}
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                  transition={{ duration: 0.35 * d, ease: EASE, delay: i * 0.05 * d }}
                  className="absolute inset-0 flex flex-col justify-center"
                >
                  <p className="truncate text-[0.8125rem] font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.kind === "Account" ? `${row.stock} in stock` : "Starts in minutes"}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative shrink-0 text-right">
              <p className="text-[0.8125rem] font-semibold tabular-nums">
                ₦<RollingNumber value={row.price} animated={!reduced} />
              </p>
              <p className="text-[0.6875rem] text-muted-foreground">{row.unit}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Counts the figure up to its new value instead of hard-swapping it. */
export function RollingNumber({ value, animated }: { value: number; animated: boolean }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());

  React.useEffect(() => {
    if (!animated) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.5, ease: EASE });
    return () => controls.stop();
  }, [mv, value, animated]);

  return <motion.span>{text}</motion.span>;
}
