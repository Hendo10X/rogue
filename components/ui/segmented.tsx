"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A pill segmented control. The active pill slides between options with a
 * shared layout animation instead of snapping.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }[];
  /** Unique per page so two controls never share a sliding pill. */
  id: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-white/[0.04] p-1 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.05)]",
        className
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors duration-200",
              size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-3.5 text-[0.8125rem]",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-0 rounded-full bg-white/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {o.icon}
              {o.label}
              {o.count != null && (
                <span className={cn("tabular-nums", on ? "text-[#ffb27a]" : "text-muted-foreground/60")}>
                  {o.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
