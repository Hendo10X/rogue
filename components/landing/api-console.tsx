"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const CALLS = [
  {
    id: "balance",
    method: "GET",
    path: "/api/v1/balance",
    request: `curl https://roguesocials.com/api/v1/balance \\
  -H "Authorization: Bearer rogue_xxx"`,
    response: `{
  "data": {
    "balance": "15400.00",
    "currency": "NGN"
  }
}`,
  },
  {
    id: "services",
    method: "GET",
    path: "/api/v1/services",
    request: `curl https://roguesocials.com/api/v1/services?q=instagram \\
  -H "Authorization: Bearer rogue_xxx"`,
    response: `{
  "data": [{
    "service": 123,
    "name": "Instagram Followers — Premium",
    "min": "10", "max": "100000",
    "rate_per_1000": 1300.00
  }],
  "count": 1
}`,
  },
  {
    id: "order",
    method: "POST",
    path: "/api/v1/orders",
    request: `curl -X POST https://roguesocials.com/api/v1/orders \\
  -H "Authorization: Bearer rogue_xxx" \\
  -d '{ "service": 123, "quantity": 1000,
        "link": "https://instagram.com/you" }'`,
    response: `{
  "data": {
    "id": "b1f3…",
    "charge": "1300.00",
    "currency": "NGN",
    "status": "processing"
  }
}`,
  },
];

/**
 * The reseller API as a console: pick an endpoint and the request types out,
 * then the response fades up. Typing starts once it scrolls into view.
 */
export function ApiConsole() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [active, setActive] = React.useState(0);
  const [typed, setTyped] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const reduced = useReducedMotion();
  const call = CALLS[active];
  const done = reduced || typed >= call.request.length;

  React.useEffect(() => {
    if (reduced || !inView) return;
    setTyped(0);
    const timer = window.setInterval(() => {
      setTyped((t) => {
        if (t >= call.request.length) {
          window.clearInterval(timer);
          return t;
        }
        return t + 3;
      });
    }, 16);
    return () => window.clearInterval(timer);
  }, [call.request, reduced, inView]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(call.request);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can be blocked; the text is still selectable.
    }
  }

  return (
    <div ref={ref} className="w-full min-w-0">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="inline-flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full bg-white/[0.04] p-1 [scrollbar-width:none]">
          {CALLS.map((c, i) => {
            const on = i === active;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={on}
                className="relative flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium sm:px-3"
              >
                {on && (
                  <motion.span
                    layoutId="api-tab"
                    className="absolute inset-0 rounded-full bg-white/[0.1]"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className={cn("relative font-mono text-[0.625rem]", c.method === "POST" ? "text-[#ffd31a]" : "text-[#ff9a4a]")}>
                  {c.method}
                </span>
                <span className={cn("relative capitalize", on ? "text-foreground" : "text-muted-foreground")}>{c.id}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} className="size-3.5" />
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <pre className="min-h-28 max-w-full overflow-x-auto px-4 pt-5 pb-3 font-mono text-[0.6875rem] leading-relaxed text-foreground/90 sm:px-5 sm:text-[0.75rem]">
        <span className="text-muted-foreground/60 select-none">$ </span>
        {reduced ? call.request : call.request.slice(0, typed)}
        {!done && <span className="ml-px inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-[#ff8a1a]" />}
      </pre>

      <div className="mx-2 mb-2 rounded-xl bg-black/30">
        <div className="flex items-center gap-2 px-3 pt-3">
          <span className={cn("size-1.5 rounded-full transition-colors", done ? "bg-emerald-400" : "bg-muted-foreground/40")} />
          <span className="font-mono text-[0.6875rem] text-muted-foreground">{done ? "200 OK" : "waiting…"}</span>
        </div>
        <div className="min-h-44">
          <AnimatePresence mode="wait">
            {done && (
              <motion.pre
                key={call.id}
                initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="max-w-full overflow-x-auto px-3 pt-2 pb-3 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground sm:text-[0.75rem]"
              >
                {call.response}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
