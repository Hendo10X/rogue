"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldSet, FieldLabel } from "@/components/ui/field";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [marketplace, setMarketplace] = useState("");
  const [boosting, setBoosting] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setMarketplace(String(data.markupNairaMarketplace ?? 0));
        setBoosting(String(data.markupNairaBoosting ?? 0));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const m = parseFloat(marketplace);
    const b = parseFloat(boosting);
    if (!Number.isFinite(m) || m < 0 || !Number.isFinite(b) || b < 0) {
      toast.error("Enter valid Naira amounts (0 or more)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace: m, boosting: b }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="max-w-md border shadow-none">
        <CardHeader>
          <h2 className="font-medium">Profit / Markup (Naira)</h2>
          <p className="text-muted-foreground text-sm">
            Fixed amount in Naira added to supplier prices (converted from USD). 
            Applied to marketplace listings and boosting services.
          </p>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="marketplace">Marketplace Markup (₦)</FieldLabel>
                <Input
                  id="marketplace"
                  type="number"
                  min={0}
                  step={10}
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="boosting">Boosting Markup (₦)</FieldLabel>
                <Input
                  id="boosting"
                  type="number"
                  min={0}
                  step={10}
                  value={boosting}
                  onChange={(e) => setBoosting(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
          <Button
            className="mt-4"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
