"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { formatAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { SectionLabel } from "@/components/page-header";

type Request = {
  id: string;
  platform: string;
  details: string;
  quantity: number;
  budgetNgn: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  open: "Received",
  sourcing: "Sourcing",
  fulfilled: "Available",
  declined: "Unavailable",
};

const EMPTY = { platform: "", details: "", quantity: "1", budget: "" };

/** Customers describe a log they can't find; admins reply from Ozymandias → Requests. */
export function LogRequestForm() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const queryClient = useQueryClient();

  const load = useCallback(async () => {
    const res = await fetch("/api/log-requests");
    if (res.ok) setRequests((await res.json()).requests ?? []);
    // Loading them marks replies read: clear the sidebar dot.
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/log-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          details: form.details,
          quantity: form.quantity,
          budgetNgn: form.budget ? Number(form.budget) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send your request");
      toast.success("Request sent. We'll update it here.");
      setForm(EMPTY);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your request");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} className="surface flex flex-col gap-4 rounded-2xl p-5">
        <FieldSet>
          <FieldGroup className="grid gap-3 sm:grid-cols-3">
            <Field className="sm:col-span-1">
              <FieldLabel>Platform</FieldLabel>
              <Input required placeholder="Facebook, Instagram…" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Quantity</FieldLabel>
              <Input required type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Budget per log (₦, optional)</FieldLabel>
              <Input type="number" min={0} step={50} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel>What do you need?</FieldLabel>
            <Textarea
              required
              rows={4}
              className="resize-none"
              placeholder="e.g. Aged 2018 Facebook with marketplace enabled, USA, 2FA on"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
            />
          </Field>
        </FieldSet>
        <div className="flex justify-end">
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send request"}
          </Button>
        </div>
      </form>

      {requests.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel>Your requests</SectionLabel>
          <div className="surface flex flex-col gap-0.5 rounded-2xl p-1.5">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-col gap-1.5 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {r.platform} · {r.quantity}
                    {r.budgetNgn ? ` · up to ₦${formatAmount(r.budgetNgn)}` : ""}
                  </p>
                  <Badge variant={r.status === "fulfilled" ? "default" : "secondary"}>{REQUEST_STATUS_LABEL[r.status] ?? r.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.details}</p>
                {r.adminNote && <p className="text-sm">Rogue: {r.adminNote}</p>}
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
