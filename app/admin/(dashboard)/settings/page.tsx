"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldSet, FieldLabel } from "@/components/ui/field";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminSettingsPage() {
  const [marketplace, setMarketplace] = useState("");
  const [boosting, setBoosting] = useState("");
  const [announcement, setAnnouncement] = useState<{
    active: boolean;
    type: "banner" | "modal";
    message: string;
    id: string;
  }>({
    active: false,
    type: "banner",
    message: "",
    id: crypto.randomUUID(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setMarketplace(String(data.markupNairaMarketplace ?? 0));
        setBoosting(String(data.markupNairaBoosting ?? 0));
        if (data.announcement) {
          setAnnouncement(data.announcement);
        }
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
    
    // Always assign a new ID when saving so the client knows it's a "new" version
    // even if they dismissed the exact same message previously.
    const payloadAnnouncement = {
      ...announcement,
      id: crypto.randomUUID(),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          marketplace: m, 
          boosting: b,
          announcement: payloadAnnouncement
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setAnnouncement(payloadAnnouncement);
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
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profit Margins */}
        <Card className="border shadow-none">
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
          </CardContent>
        </Card>

        {/* Site Announcement */}
        <Card className="border shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium">Site Announcement</h2>
                <p className="text-muted-foreground text-sm">
                  Display a global message to all users on the home page.
                </p>
              </div>
              <Switch 
                checked={announcement.active}
                onCheckedChange={(c: boolean) => setAnnouncement(prev => ({ ...prev, active: c }))}
              />
            </div>
          </CardHeader>
          <CardContent>
            <FieldSet disabled={!announcement.active}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Display Type</FieldLabel>
                  <Select 
                    value={announcement.type} 
                    onValueChange={(v: "banner" | "modal") => setAnnouncement(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">Top Banner</SelectItem>
                      <SelectItem value="modal">Centered Modal</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Message Content</FieldLabel>
                  <Textarea 
                    rows={4}
                    className="resize-none"
                    placeholder="We will be undergoing scheduled maintenance this Sunday..."
                    value={announcement.message}
                    onChange={(e) => setAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>
      </div>

      <Button
        size="lg"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save All Settings"}
      </Button>
    </div>
  );
}
