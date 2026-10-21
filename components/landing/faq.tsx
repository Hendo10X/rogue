"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { FAQ_ITEMS } from "@/lib/faq";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Faq() {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <div className="flex flex-col gap-2">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.id}
            className={cn(
              "rounded-2xl transition-colors duration-300",
              isOpen ? "surface" : "bg-white/[0.02] hover:bg-white/[0.04]"
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-[0.9375rem] font-medium tracking-[-0.01em]">{item.question}</span>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  isOpen ? "rotate-45 bg-[#ff7a1a]/15 text-[#ffb27a]" : "bg-white/[0.05] text-muted-foreground"
                )}
              >
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-3.5" />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl px-5 pb-5 text-sm leading-relaxed text-pretty text-muted-foreground">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
