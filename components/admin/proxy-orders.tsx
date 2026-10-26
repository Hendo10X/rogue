"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { formatAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/page-header";

type Row = {
  id: string;
  providerOrderId: string | null;
  country: string;
  period: string;
  quantity: number;
  amount: string;
  status: string;
  createdAt: string;
  userEmail: string;
};

/** Recent proxy sales, with a button that asks proxy-seller about one order right now. */
export function ProxyOrders() {
  const [rows, setRows] = useState<Row[]>([]);
  const [checking, setChecking] = useState<string | null>(null);
  const [raw, setRaw] = useState<{ id: string; text: string } | null>(null);

  const load = () =>
    fetch("/api/admin/proxies/orders")
      .then((r) => r.json())
      .then((d) => setRows(d.orders ?? []))
      .catch(() => {});

  useEffect(() => {
    void load();
  }, []);

  async function check(row: Row) {
    setChecking(row.id);
    try {
      const res = await fetch("/api/admin/proxies/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast[data.found ? "success" : "message"](
        data.found ? `${data.found} proxies found and delivered` : "proxy-seller hasn't issued them yet",
      );
      setRaw({ id: row.id, text: JSON.stringify(data.raw, null, 2) });
      await load();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Check failed");
    } finally {
      setChecking(null);
    }
  }

  if (rows.length === 0) return null;
  return (
    <section className="surface flex flex-col gap-3 rounded-2xl p-5 lg:col-span-2">
      <SectionLabel>Proxy orders</SectionLabel>
      <div className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-xl px-2 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm">
                {r.quantity} × {r.country} · {r.period} · ₦{formatAmount(r.amount)} · {r.userEmail}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                <Button size="xs" variant="outline" disabled={checking === r.id} onClick={() => check(r)}>
                  {checking === r.id ? "Checking…" : "Check with proxy-seller"}
                </Button>
              </div>
            </div>
            {raw?.id === r.id && (
              <pre className="max-h-64 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-[0.6875rem] break-all whitespace-pre-wrap">
                {`proxy-seller order ${r.providerOrderId}\n${raw.text}`}
              </pre>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
