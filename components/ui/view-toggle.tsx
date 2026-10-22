"use client";

import * as React from "react";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GridViewIcon, ListViewIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

/**
 * Grid / list preference for one page, remembered per browser. Storage can be
 * unavailable (private mode), so every read and write is guarded and the
 * default simply applies.
 */
export function useViewMode(key: string, fallback: ViewMode) {
  const storageKey = `rogue-view:${key}`;
  const [mode, setMode] = React.useState<ViewMode>(fallback);

  // Read after mount so server and first client render agree.
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "grid" || saved === "list") setMode(saved);
    } catch {
      // Storage blocked — keep the default.
    }
  }, [storageKey]);

  const update = React.useCallback(
    (next: ViewMode) => {
      setMode(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Session-only preference is fine.
      }
    },
    [storageKey]
  );

  return [mode, update] as const;
}

const OPTIONS: { value: ViewMode; label: string; icon: typeof GridViewIcon }[] = [
  { value: "grid", label: "Grid view", icon: GridViewIcon },
  { value: "list", label: "List view", icon: ListViewIcon },
];

/** Two-icon pill switch; the highlight slides between grid and list. */
export function ViewToggle({
  value,
  onChange,
  id,
  className,
  size = "md",
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  /** Unique per page so the sliding pill never jumps between toggles. */
  id: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/[0.04] p-1 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]",
        size === "sm" ? "h-9" : "h-11",
        className
      )}
    >
      {OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex items-center justify-center rounded-full transition-colors duration-200",
              size === "sm" ? "h-7 w-8" : "h-9 w-10",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {on && (
              <motion.span
                layoutId={`view-${id}`}
                className="absolute inset-0 rounded-full bg-white/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <HugeiconsIcon icon={o.icon} strokeWidth={1.75} className={cn("relative", size === "sm" ? "size-4" : "size-[18px]")} />
          </button>
        );
      })}
    </div>
  );
}
