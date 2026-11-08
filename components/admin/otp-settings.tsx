"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionLabel } from "@/components/page-header";

type Provider = {
  provider: "grizzly" | "smspool";
  label: string;
  configured: boolean;
  enabled: boolean;
  balanceUsd: number | null;
  error: string | null;
};

type Data = {
  enabled: boolean;
  markupPercent: number;
  configured: boolean;
  providers: Provider[];
  minSuccessRate: number;
  hiddenApps?: number;
};

type Patch = Partial<{ enabled: boolean; markupPercent: number; grizzly: boolean; smspool: boolean; minSuccessRate: number }>;

const ENV: Record<Provider["provider"], string> = { grizzly: "GRIZZLY_API_KEY", smspool: "SMSPOOL_API_KEY" };

/** OTP numbers: sales on/off, markup, and which providers (GrizzlySMS, SMSPool) numbers are bought from. */
export function OtpSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [markup, setMarkup] = useState("");
  const [minSuccess, setMinSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/otp")
      .then((r) => r.json())
      .then((d: Data) => {
        setData(d);
        setMarkup(String(d.markupPercent));
        setMinSuccess(String(d.minSuccessRate));
      })
      .catch(() => toast.error("Failed to load OTP settings"));
  }, []);

  async function save(patch: Patch) {
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

  async function showHidden() {
    if (!window.confirm("Show every hidden app again? Ones that are still sold out will hide again after one failed try.")) return;
    const res = await fetch("/api/admin/otp", { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to show hidden apps");
    setData((d) => (d ? { ...d, hiddenApps: 0 } : d));
    toast.success("All hidden apps are showing again");
  }

  if (!data) return null;
  const anyOn = data.providers.some((p) => p.configured && p.enabled);
  return (
    <section className="surface flex flex-col gap-4 rounded-2xl p-5">
      <SectionLabel>OTP numbers</SectionLabel>
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
      {data.enabled && !anyOn && (
        <p className="text-sm text-amber-300">Sales are on, but no provider is switched on, so customers can&apos;t buy numbers yet.</p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Numbers come from the cheapest switched-on provider that has them. Each provider is paid from its own USD balance, so keep both topped up.
        </p>
        {data.providers.map((p) => (
          <div key={p.provider} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={p.enabled}
                disabled={saving || !p.configured}
                onCheckedChange={(v) => save({ [p.provider]: v })}
                aria-label={`Buy numbers from ${p.label}`}
              />
              {p.label}
            </label>
            <span className="text-sm text-muted-foreground tabular-nums">
              {!p.configured
                ? `${ENV[p.provider]} isn't set in Vercel`
                : p.error
                  ? `Error: ${p.error}`
                  : `Balance $${(p.balanceUsd ?? 0).toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-muted-foreground">
          SMSPool sells each app from several pools; cheap ones can fail often (USA WhatsApp was 54%). Pools below this success rate aren&apos;t used.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Min success %</span>
          <Input type="number" min={0} max={100} className="h-9 w-20" value={minSuccess} onChange={(e) => setMinSuccess(e.target.value)} />
          <Button size="sm" variant="outline" disabled={saving} onClick={() => save({ minSuccessRate: Number(minSuccess) })}>
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data.hiddenApps
            ? `${data.hiddenApps} sold-out app${data.hiddenApps === 1 ? "" : "s"} hidden from customers.`
            : "No apps hidden. Apps that turn out to be sold out are hidden here until you show them again."}
        </p>
        {!!data.hiddenApps && (
          <Button size="sm" variant="outline" onClick={showHidden}>
            Show them again
          </Button>
        )}
      </div>
    </section>
  );
}
