"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionLabel } from "@/components/page-header";

type Data = {
  enabled: boolean;
  markupPercent: number;
  configured: boolean;
  balanceUsd: number | null;
  providerError: string | null;
};

/** Turn OTP number sales on or off, set the markup, and see the otpking balance. */
export function OtpSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [markup, setMarkup] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/otp")
      .then((r) => r.json())
      .then((d: Data) => {
        setData(d);
        setMarkup(String(d.markupPercent));
      })
      .catch(() => toast.error("Failed to load OTP settings"));
  }, []);

  async function save(patch: Partial<Pick<Data, "enabled" | "markupPercent">>) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const next = await res.json();
      if (!res.ok) throw new Error(next.error);
      setData((d) => (d ? { ...d, ...next } : d));
      toast.success("OTP settings saved");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!data) return null;
  return (
    <section className="surface flex flex-col gap-4 rounded-2xl p-5">
      <SectionLabel>OTP numbers (otpking)</SectionLabel>
      <p className="text-sm text-muted-foreground">
        {!data.configured
          ? "OTPKING_API_KEY isn't set in Vercel, so OTP numbers can't be sold."
          : data.providerError
            ? `otpking error: ${data.providerError}`
            : `otpking balance: $${(data.balanceUsd ?? 0).toFixed(2)}. Numbers are paid from this balance, so keep it topped up.`}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={data.enabled} disabled={saving || !data.configured} onCheckedChange={(v) => save({ enabled: v })} />
          Sell numbers on Tools → OTP numbers
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Markup %</span>
          <Input type="number" min={0} className="h-9 w-24" value={markup} onChange={(e) => setMarkup(e.target.value)} />
          <Button size="sm" variant="outline" disabled={saving} onClick={() => save({ markupPercent: Number(markup) })}>
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}
