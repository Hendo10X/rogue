"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { BankIcon, Loading03Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Details = { bank: string; accountName: string; accountNumber: string; proofUrl: string };

const FIELDS: { key: keyof Details; label: string; placeholder: string; inputMode?: "numeric" | "url" }[] = [
  { key: "bank", label: "Bank", placeholder: "Moniepoint MFB" },
  { key: "accountName", label: "Account name", placeholder: "Account holder name" },
  { key: "accountNumber", label: "Account number", placeholder: "0123456789", inputMode: "numeric" },
  { key: "proofUrl", label: "Where to send the receipt", placeholder: "https://t.me/yourname", inputMode: "url" },
];

/** Bank details customers see when they choose "Manual transfer" on the wallet page. */
export function ManualFundingForm() {
  const [saved, setSaved] = useState<Details | null>(null);
  const [draft, setDraft] = useState<Details | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/manual-funding")
      .then((r) => r.json())
      .then((d: Details) => {
        setSaved(d);
        setDraft(d);
      })
      .catch(() => toast.error("Could not load manual payment details."));
  }, []);

  const dirty = !!draft && !!saved && FIELDS.some((f) => draft[f.key] !== saved[f.key]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/manual-funding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      setSaved(draft);
      toast.success("Manual payment details updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="surface flex flex-col gap-5 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(140deg,rgb(255_90_31/0.2),rgb(255_211_26/0.06))] text-[#ffb27a]">
          <HugeiconsIcon icon={BankIcon} strokeWidth={1.75} className="size-5" />
        </span>
        <div>
          <h2 className="text-[0.9375rem] font-semibold tracking-[-0.015em]">Manual payment account</h2>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            Shown to customers who pick &ldquo;Manual transfer&rdquo; on the wallet page.
          </p>
        </div>
      </div>

      {!draft ? (
        <div className="flex justify-center py-4">
          <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1.5">
              <span className="text-[0.8125rem] font-medium">{f.label}</span>
              <Input
                value={draft[f.key]}
                inputMode={f.inputMode}
                placeholder={f.placeholder}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                className="h-10"
              />
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!dirty || saving}>
          {saving && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
          Save details
        </Button>
      </div>
    </form>
  );
}
