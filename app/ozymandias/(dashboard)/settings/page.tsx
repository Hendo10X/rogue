"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldSet, FieldLabel } from "@/components/ui/field";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AdminEmailsManager } from "@/components/admin/admin-emails-manager";
import { ManualFundingForm } from "@/components/admin/manual-funding-form";
import { ProxySettings } from "@/components/admin/proxy-settings";
import { ProxyOrders } from "@/components/admin/proxy-orders";
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
    linkLabel?: string;
    linkHref?: string;
  }>({
    active: false,
    type: "banner",
    message: "",
    id: crypto.randomUUID(),
    linkLabel: "",
    linkHref: "",
  });
  const [boostingAnnouncement, setBoostingAnnouncement] = useState<{
    active: boolean;
    message: string;
    id: string;
  }>({
    active: false,
    message: "",
    id: crypto.randomUUID(),
  });
  const [flatFee, setFlatFee] = useState("1500");
  const [threshold, setThreshold] = useState("9000");
  const [percent, setPercent] = useState("20");
  const [priceCap, setPriceCap] = useState("500000");
  const [apiMarkup, setApiMarkup] = useState("30");
  const [lowBalance, setLowBalance] = useState("30000");
  const [actionPin, setActionPin] = useState("");
  const [hasActionPin, setHasActionPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((data) => {
          setMarketplace(String(data.markupNairaMarketplace ?? 0));
          setBoosting(String(data.markupNairaBoosting ?? 0));
          if (data.pricing) {
            setFlatFee(String(data.pricing.flatFeeNaira ?? 1500));
            setThreshold(String(data.pricing.thresholdNaira ?? 9000));
            setPercent(String(data.pricing.percent ?? 20));
            setPriceCap(String(data.pricing.priceCapNaira ?? 500000));
          }
          setApiMarkup(String(data.apiMarkupPercent ?? 30));
          setLowBalance(String(data.supplierLowBalanceThreshold ?? 30000));
          if (data.announcement) setAnnouncement(data.announcement);
          if (data.boostingAnnouncement) setBoostingAnnouncement(data.boostingAnnouncement);
          setHasActionPin(!!data.hasActionPin);
        }),
    ])
      .catch(() => {
        toast.error("Failed to load admin configuration");
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
    
    const payloadAnnouncement = { ...announcement, id: crypto.randomUUID() };
    const payloadBoostingAnnouncement = { ...boostingAnnouncement, id: crypto.randomUUID() };

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace: m,
          boosting: b,
          announcement: payloadAnnouncement,
          boostingAnnouncement: payloadBoostingAnnouncement,
          pricing: {
            flatFeeNaira: Number(flatFee) || 0,
            thresholdNaira: Number(threshold) || 0,
            percent: Number(percent) || 0,
            priceCapNaira: Number(priceCap) || 0,
          },
          apiMarkupPercent: Math.max(0, Number(apiMarkup) || 0),
          supplierLowBalanceThreshold: Math.max(0, Number(lowBalance) || 0),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setAnnouncement(payloadAnnouncement);
      setBoostingAnnouncement(payloadBoostingAnnouncement);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePin() {
    const pin = actionPin.trim();
    if (pin && !/^\d{4}$/.test(pin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    setSavingPin(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionPin: pin }),
      });
      if (!res.ok) throw new Error("Failed to save PIN");
      setHasActionPin(!!pin);
      setActionPin("");
      toast.success(pin ? "Security PIN saved" : "Security PIN cleared");
    } catch {
      toast.error("Failed to save PIN");
    } finally {
      setSavingPin(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5"><h1 className="text-2xl font-semibold tracking-[-0.03em]">Settings</h1></div>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5"><h1 className="text-2xl font-semibold tracking-[-0.03em]">Settings</h1></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminEmailsManager />
        <ManualFundingForm />
        <ProxySettings />
        <ProxyOrders />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profit Margins */}
        <Card>
          <CardHeader >
            <h2 className="text-sm font-semibold tracking-[-0.01em]">Profit / Markup (Naira)</h2>
            <p className="text-sm text-muted-foreground">
              Boosting markup is the fixed Naira amount added to boosting
              services. Marketplace logs now use the tiered pricing below — this
              marketplace value only affects manual log baselines.
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
        <Card>
          <CardHeader >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-[-0.01em]">Site Announcement</h2>
                <p className="text-sm text-muted-foreground">
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Link label (optional)</FieldLabel>
                    <Input
                      placeholder="Fund wallet"
                      value={announcement.linkLabel ?? ""}
                      onChange={(e) => setAnnouncement(prev => ({ ...prev, linkLabel: e.target.value }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Link URL (optional)</FieldLabel>
                    <Input
                      placeholder="/wallet/deposit"
                      value={announcement.linkHref ?? ""}
                      onChange={(e) => setAnnouncement(prev => ({ ...prev, linkHref: e.target.value }))}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>
      </div>

      {/* Marketplace Log Pricing (tiered) */}
      <Card>
        <CardHeader >
          <h2 className="text-sm font-semibold tracking-[-0.01em]">Marketplace Log Pricing</h2>
          <p className="text-sm text-muted-foreground">
            Cheap logs (below the threshold) get a flat Naira fee added. Logs at
            or above the threshold get a percentage markup instead. Any
            auto-synced log that would still price above the cap is hidden from
            the marketplace, so customers never see scary prices.
          </p>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="flatFee">Flat fee for cheap logs (₦)</FieldLabel>
                <Input
                  id="flatFee"
                  type="number"
                  min={0}
                  step={50}
                  value={flatFee}
                  onChange={(e) => setFlatFee(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="threshold">Threshold — flat vs % (₦)</FieldLabel>
                <Input
                  id="threshold"
                  type="number"
                  min={0}
                  step={500}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="percent">Markup for logs ≥ threshold (%)</FieldLabel>
                <Input
                  id="percent"
                  type="number"
                  min={0}
                  step={1}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="priceCap">Hide logs above this price (₦, 0 = no cap)</FieldLabel>
                <Input
                  id="priceCap"
                  type="number"
                  min={0}
                  step={1000}
                  value={priceCap}
                  onChange={(e) => setPriceCap(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      {/* Rogue API */}
      <Card>
        <CardHeader >
          <h2 className="text-sm font-semibold tracking-[-0.01em]">Rogue API — Reseller Markup</h2>
          <p className="text-sm text-muted-foreground">
            Your profit % added on top of the supplier&apos;s cost for orders
            placed through the public Rogue API. e.g. 30 means API users pay
            supplier cost + 30%. Because it&apos;s a markup over cost (not a
            discount off the website price), you can never sell below cost and
            lose money.
          </p>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="apiMarkup">API reseller markup (%)</FieldLabel>
                <Input
                  id="apiMarkup"
                  type="number"
                  min={0}
                  step={1}
                  value={apiMarkup}
                  onChange={(e) => setApiMarkup(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      {/* Supplier balance alert */}
      <Card>
        <CardHeader >
          <h2 className="text-sm font-semibold tracking-[-0.01em]">Supplier Balance Alert</h2>
          <p className="text-sm text-muted-foreground">
            Every order is paid from your prepaid balance with the supplier
            (e.g. AcctShop). When it runs out, every order fails with
            &quot;Insufficient balance&quot; even though stock looks fine. You get
            a Telegram alert when a supplier&apos;s balance drops below this
            amount, and immediately if a supplier rejects an order for
            insufficient balance. Use the same unit the supplier shows.
          </p>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="lowBalance">Alert when balance is below</FieldLabel>
                <Input
                  id="lowBalance"
                  type="number"
                  min={0}
                  step={1000}
                  value={lowBalance}
                  onChange={(e) => setLowBalance(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      {/* Security PIN */}
      <Card>
        <CardHeader >
          <h2 className="text-sm font-semibold tracking-[-0.01em]">Security PIN</h2>
          <p className="text-sm text-muted-foreground">
            Set a 4-digit PIN required for sensitive actions like funding or deleting users.
            {hasActionPin && <span className="ml-1 text-emerald-400 font-medium">PIN is currently set.</span>}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                {hasActionPin ? "Change PIN (leave blank to clear)" : "Set PIN"}
              </label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={actionPin}
                onChange={(e) => setActionPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-28 tracking-[0.5em] text-center text-lg"
              />
            </div>
            <Button
              variant="outline"
              disabled={savingPin}
              onClick={handleSavePin}
            >
              {savingPin ? "Saving…" : hasActionPin ? "Update PIN" : "Save PIN"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Boosting Announcement */}
      <Card>
        <CardHeader >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-[-0.01em]">Boosting Announcement</h2>
              <p className="text-sm text-muted-foreground">
                Display a modal announcement specifically on the Boosting page when users land on it.
              </p>
            </div>
            <Switch
              checked={boostingAnnouncement.active}
              onCheckedChange={(c: boolean) => setBoostingAnnouncement(prev => ({ ...prev, active: c }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          <FieldSet disabled={!boostingAnnouncement.active}>
            <FieldGroup>
              <Field>
                <FieldLabel>Message Content</FieldLabel>
                <Textarea
                  rows={4}
                  className="resize-none"
                  placeholder="⚡ Boosting orders may take 24–72 hours depending on service load..."
                  value={boostingAnnouncement.message}
                  onChange={(e) => setBoostingAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      {/* Manual logs now have their own page. */}
      <p className="text-sm text-muted-foreground">
        Manual logs moved to{" "}
        <a href="/ozymandias/manual-logs" className="text-foreground underline underline-offset-4">
          Manual logs
        </a>
        .
      </p>

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
