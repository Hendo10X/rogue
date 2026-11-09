"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionLabel } from "@/components/page-header";

type Bulk = { enabled: boolean; minQty: number; amountOff: number };

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** Bulk discount on all logs: turn it on, set how many pieces count as bulk, and the flat ₦ off each piece. */
export function BulkPricingSettings() {
  const [data, setData] = useState<Bulk | null>(null);
  const [minQty, setMinQty] = useState("");
  const [amountOff, setAmountOff] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bulk-pricing")
      .then((r) => r.json())
      .then((d: Bulk) => {
        setData(d);
        setMinQty(String(d.minQty));
        setAmountOff(String(d.amountOff));
      })
      .catch(() => toast.error("Failed to load bulk pricing"));
  }, []);

  async function save(enabled: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bulk-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, minQty: Number(minQty), amountOff: Number(amountOff.replace(/[₦,\s]/g, "")) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
      toast.success(d.enabled ? `Bulk pricing on: ${naira(d.amountOff)} off each piece for ${d.minQty}+.` : "Bulk pricing is off.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Bulk pricing (all logs)</SectionLabel>
        {data && <Switch checked={data.enabled} disabled={saving} onCheckedChange={(v) => void save(v)} aria-label="Bulk pricing on" />}
      </div>
      {!data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Buying the bulk quantity or more takes a flat amount off every piece. Customers see the normal price and the bulk price, on the website and in the Telegram bot.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Bulk starts at (pieces)</span>
              <Input inputMode="numeric" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Discount per piece (₦)</span>
              <Input inputMode="numeric" value={amountOff} onChange={(e) => setAmountOff(e.target.value)} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            A log never goes down to what it costs you: if the discount would get there, that log just keeps its normal price. Keep the discount below your flat fee so cheap logs get it too.
          </p>
          <Button onClick={() => void save(data.enabled)} disabled={saving} className="self-start">
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      )}
    </section>
  );
}
