"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Keeps a value on one line and shrinks its font just enough to fit the
 * available width — for money, where wrapping or truncating digits is never
 * acceptable. Re-measures when the box resizes or the content changes.
 */
export function FitText({
  children,
  className,
  /** Smallest size it may shrink to, as a fraction of the CSS font size. */
  minScale = 0.45,
}: {
  children: React.ReactNode;
  className?: string;
  minScale?: number;
}) {
  const boxRef = React.useRef<HTMLSpanElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [scale, setScale] = React.useState(1);
  const scaleRef = React.useRef(1);
  // Layout effects run in order, so the measure below reads the latest scale.
  React.useLayoutEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  React.useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;

    const measure = () => {
      // Width scales linearly with font size, so the full-size width is the
      // current width divided by the current scale. Never touch the style
      // here — React owns it, and clearing it can leave the text oversized.
      // 2% headroom so sub-pixel rounding and tight tracking never clip a digit.
      const available = box.clientWidth * 0.98;
      const fullWidth = text.scrollWidth / scaleRef.current;
      const next = fullWidth > available && fullWidth > 0 ? Math.max(minScale, available / fullWidth) : 1;
      setScale((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    // The text resizes on its own when a breakpoint changes the font size.
    ro.observe(text);
    const mo = new MutationObserver(measure);
    mo.observe(text, { childList: true, subtree: true, characterData: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [minScale]);

  return (
    <span ref={boxRef} className={cn("block w-full min-w-0 overflow-hidden", className)}>
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap"
        style={scale < 1 ? { fontSize: `${scale}em` } : undefined}
      >
        {children}
      </span>
    </span>
  );
}
