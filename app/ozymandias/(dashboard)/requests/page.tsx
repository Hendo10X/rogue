"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { formatAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, PageHeader } from "@/components/page-header";
import { REQUEST_STATUS_LABEL } from "@/components/tools/log-request-form";

type Row = {
  id: string;
  platform: string;
  details: string;
  quantity: number;
  budgetNgn: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  userEmail: string;
  userName: string;
};

const FILTERS = [
  { value: "active", label: "To do" },
  { value: "fulfilled", label: "Available" },
  { value: "declined", label: "Unavailable" },
  { value: "all", label: "All" },
];
const ACTIONS: { status: string; label: string }[] = [
  { status: "sourcing", label: "Sourcing" },
  { status: "fulfilled", label: "Available" },
  { status: "declined", label: "Unavailable" },
];

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/log-requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.requests ?? []);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(row: Row, status: string) {
    const adminNote = notes[row.id] ?? row.adminNote ?? "";
    const res = await fetch("/api/admin/log-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status, adminNote }),
    });
    if (!res.ok) return toast.error("Failed to update request");
    toast.success(`Marked ${REQUEST_STATUS_LABEL[status].toLowerCase()}`);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status, adminNote: adminNote || null } : r)));
  }

  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "active" ? r.status === "open" || r.status === "sourcing" : r.status === filter,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Log requests"
        description="Logs customers asked for. Your note is shown to them on their Request a log page."
        action={<Segmented id="log-requests" value={filter} onChange={setFilter} options={FILTERS} />}
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState title="Nothing here" description="New requests show up under To do." />
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((r) => (
            <div key={r.id} className="surface flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {r.platform} · {r.quantity}
                  {r.budgetNgn ? ` · up to ₦${formatAmount(r.budgetNgn)} each` : ""}
                </p>
                <Badge variant="secondary">{REQUEST_STATUS_LABEL[r.status] ?? r.status}</Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.details}</p>
              <p className="text-xs text-muted-foreground">
                {r.userName} · {r.userEmail} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Note to the customer (optional)"
                  value={notes[r.id] ?? r.adminNote ?? ""}
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                />
                <div className="flex shrink-0 gap-2">
                  {ACTIONS.map((a) => (
                    <Button key={a.status} size="sm" variant={a.status === "fulfilled" ? "default" : "outline"} onClick={() => update(r, a.status)}>
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
