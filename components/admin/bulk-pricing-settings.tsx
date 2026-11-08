"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionLabel } from "@/components/page-header";

type Bulk = { enabled: boolean; minQty: number; percent: number };

/** Bulk discount on all logs: turn it on, set how many pieces count as bulk, and the discount. */
export function BulkPricingSettings() {
  const [data, setData] = useState<Bulk | null>(null);
  const [minQty, setMinQty] = useState("");
  const [percent, setPercent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bulk-pricing")
      .then((r) => r.json())
      .then((d: Bulk) => {
        setData(d);
        setMinQty(String(d.minQty));
        setPercent(String(d.percent));
      })
      .catch(() => toast.error("Failed to load bulk pricing"));
  }, []);

  async function save(enabled: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bulk-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, minQty: Number(minQty), percent: Number(percent) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
      toast.success(d.enabled ? `Bulk pricing on: ${d.percent}% off for ${d.minQty}+ pieces.` : "Bulk pricing is off.");
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
            Customers see the normal price and the cheaper bulk price. Buying the bulk quantity or more charges the bulk price for every piece.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Bulk starts at (pieces)</span>
              <Input inputMode="numeric" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Bulk discount (%)</span>
              <Input inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
            </label>
          </div>
          <Button onClick={() => void save(data.enabled)} disabled={saving} className="self-start">
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      )}
    </section>
  );
}
