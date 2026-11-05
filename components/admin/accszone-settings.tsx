"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/page-header";

type Profit = { flatFeeNaira: number; thresholdNaira: number; percent: number };
type Data = { configured: boolean; connected: boolean; active: boolean; balanceUsd: number | null; profit: Profit };

/** AccsZone's own profit (separate from the other suppliers) and its balance. */
export function AccszoneSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState({ flatFeeNaira: "", thresholdNaira: "", percent: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/accszone")
      .then((r) => r.json())
      .then((d: Data) => {
        setData(d);
        setForm({
          flatFeeNaira: String(d.profit.flatFeeNaira),
          thresholdNaira: String(d.profit.thresholdNaira),
          percent: String(d.profit.percent),
        });
      })
      .catch(() => toast.error("Failed to load AccsZone settings"));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/accszone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flatFeeNaira: Number(form.flatFeeNaira),
          thresholdNaira: Number(form.thresholdNaira),
          percent: Number(form.percent),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("AccsZone profit saved. New prices show straight away.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, label: string, hint: string) => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span>{label}</span>
      <Input inputMode="decimal" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
      <span className="text-xs text-muted-foreground">{hint}</span>
    </label>
  );

  return (
    <section className="surface flex flex-col gap-4 rounded-2xl p-5">
      <SectionLabel>AccsZone</SectionLabel>
      {!data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {!data.configured
              ? "Add ACCSZONE_API_KEY in Vercel, then press Seed suppliers on the Suppliers page."
              : !data.connected
                ? "Key found. Press Seed suppliers on the Suppliers page to add AccsZone, then Sync."
                : `Balance: ${data.balanceUsd == null ? "unavailable" : `$${data.balanceUsd.toFixed(2)}`}${data.active ? "" : " · supplier is switched off"}. Its logs are sold on the website only, not through the API.`}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {field("flatFeeNaira", "Flat profit (₦)", "Added to logs below the threshold")}
            {field("thresholdNaira", "Threshold (₦)", "Cost where % profit starts")}
            {field("percent", "Profit (%)", "For logs at or above the threshold")}
          </div>
          <Button onClick={save} disabled={saving} className="self-start">
            {saving ? "Saving…" : "Save AccsZone profit"}
          </Button>
        </>
      )}
    </section>
  );
}
