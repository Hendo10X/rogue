"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A rounded surface with a warm spotlight that follows the pointer, plus a
 * gradient edge that lights up near the cursor. Position is written straight
 * to CSS variables, so moving the mouse never re-renders React.
 */
export function SpotlightCard({
  className,
  children,
  as = "div",
  href,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  /** Intrinsic tag only ("div", "button"); pass `href` to render a Link. */
  as?: "div" | "button" | "article";
  href?: string;
  type?: string;
}) {
  // Props must stay serialisable when this is used from a server component,
  // so the Link is chosen here rather than passed in.
  const Comp: React.ElementType = href ? Link : as;
  const ref = React.useRef<HTMLElement>(null);

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  }

  return (
    <Comp
      ref={ref}
      href={href}
      onPointerMove={onPointerMove}
      className={cn(
        "group/spot surface relative isolate overflow-hidden rounded-2xl transition-transform duration-300 ease-out",
        // Glow fill
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-300 before:[background:radial-gradient(360px_circle_at_var(--x,50%)_var(--y,50%),rgb(255_140_60/0.045),transparent_50%)] hover:before:opacity-100",
        // Lit edge
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:p-px after:opacity-0 after:transition-opacity after:duration-300 after:[background:radial-gradient(220px_circle_at_var(--x,50%)_var(--y,50%),rgb(255_170_90/0.2),transparent_65%)] after:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] after:[mask-composite:exclude] hover:after:opacity-100",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
