"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon } from "@hugeicons/core-free-icons";

import { extractSecret, PERIOD, secondsLeft, totp } from "@/lib/totp";
import { Textarea } from "@/components/ui/textarea";

type Row = { line: string; secret: string | null; code: string | null };

/**
 * Paste one or more 2FA keys (or whole log lines) and get live codes. Runs
 * entirely in the browser: nothing typed here is sent anywhere.
 */
export function TwoFactorTool() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [left, setLeft] = useState(PERIOD);

  const lines = useMemo(
    () =>
      input
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 50),
    [input],
  );

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const now = Date.now();
      setLeft(secondsLeft(now));
      const next = await Promise.all(
        lines.map(async (line) => {
          const secret = extractSecret(line);
          return { line, secret, code: secret ? await totp(secret, now) : null };
        }),
      );
      if (!cancelled) setRows(next);
    }
    void tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [lines]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Couldn't copy — select the code instead");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        autoFocus
        rows={4}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={"Paste a 2FA key, e.g. JBSW Y3DP EHPK 3PXP\nor a whole log line — one per line for several accounts."}
        className="resize-none font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Codes are generated on your device. Your keys are never sent to Rogue or anyone else.
      </p>

      {rows.length > 0 && (
        <div className="surface flex flex-col gap-0.5 rounded-2xl p-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3">
              <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{r.line}</span>
              {r.code ? (
                <button
                  type="button"
                  onClick={() => copy(r.code!)}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 font-mono text-base font-semibold tracking-[0.2em] tabular-nums hover:bg-white/[0.1]"
                  aria-label={`Copy code ${r.code}`}
                >
                  {r.code.slice(0, 3)} {r.code.slice(3)}
                  <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.75} className="size-3.5 text-muted-foreground" />
                </button>
              ) : (
                <span className="shrink-0 text-xs text-destructive">No 2FA key found</span>
              )}
            </div>
          ))}
          <div className="mx-4 my-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${(left / PERIOD) * 100}%` }}
            />
          </div>
          <p className="px-4 pb-2 text-xs text-muted-foreground tabular-nums">New codes in {left}s</p>
        </div>
      )}
    </div>
  );
}
