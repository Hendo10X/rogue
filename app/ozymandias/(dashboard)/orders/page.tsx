"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon, Loading03Icon, Refresh01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { StatCard, StatGrid } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";

interface OrderRow {
  id: string;
  type: string;
  userEmail?: string;
  status: string;
  amount: string;
  currency: string;
  quantity?: number;
  createdAt: string;
  title?: string;
  supplierName?: string;
  serviceName?: string;
  link?: string;
  externalOrderId?: number;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300",
    processing: "bg-blue-500/15 text-sky-300",
    completed: "bg-green-500/15 text-emerald-400",
    failed: "bg-red-500/15 text-red-400",
    manual_review: "bg-purple-500/15 text-violet-300",
  };
  const label = status === "manual_review" ? "Manual Review" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="secondary" className={variants[status] ?? ""}>
      {label}
    </Badge>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "queue" | "marketplace" | "boosting">("all");
  const [query, setQuery] = useState("");
  
  // Fulfillment Modal State
  const [fulfillingOrder, setFulfillingOrder] = useState<OrderRow | null>(null);
  const [credentials, setCredentials] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function fetchOrders() {
    setLoading(true);
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  async function handleFulfill() {
    if (!fulfillingOrder) return;
    if (!credentials.trim()) {
      toast.error("Please enter the credentials or delivery notes.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${fulfillingOrder.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fulfill order");
      
      toast.success("Order fulfilled successfully!");
      setFulfillingOrder(null);
      setCredentials("");
      fetchOrders(); // Refresh table
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5"><h1 className="text-2xl font-semibold tracking-[-0.03em]">Orders</h1></div>
        <p className="text-muted-foreground flex items-center gap-2">
          <Spinner className="size-4" /> Loading…
        </p>
      </div>
    );
  }

  const queue = orders.filter((o) => o.status === "manual_review" && o.type === "marketplace");
  const q = query.trim().toLowerCase();
  const shown = orders.filter((o) => {
    if (filter === "queue" && !(o.status === "manual_review" && o.type === "marketplace")) return false;
    if (filter === "marketplace" && o.type !== "marketplace") return false;
    if (filter === "boosting" && o.type !== "boosting") return false;
    if (!q) return true;
    return [o.id, o.userEmail, o.title, o.serviceName, o.link, o.status]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const tabs = [
    { id: "all" as const, label: "All", count: orders.length },
    { id: "queue" as const, label: "Needs action", count: queue.length },
    { id: "marketplace" as const, label: "Marketplace", count: orders.filter((o) => o.type === "marketplace").length },
    { id: "boosting" as const, label: "Boosting", count: orders.filter((o) => o.type === "boosting").length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length.toLocaleString()} order{orders.length === 1 ? "" : "s"} across the marketplace and boosting.
          </p>
        </div>
        <Button variant="outline" className="eyebrow" onClick={fetchOrders} disabled={loading}>
          <HugeiconsIcon icon={loading ? Loading03Icon : Refresh01Icon} className={loading ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>

      <StatGrid>
        <StatCard label="Orders" value={orders.length.toLocaleString()} hint="Latest from both channels" />
        <StatCard
          label="Needs action"
          value={queue.length.toLocaleString()}
          tone={queue.length > 0 ? "danger" : undefined}
          hint={queue.length > 0 ? "Manual review — fulfil by hand" : "Queue is clear"}
        />
        <StatCard label="Completed" value={orders.filter((o) => o.status === "completed").length.toLocaleString()} hint="Delivered" />
        <StatCard label="Failed" value={orders.filter((o) => o.status === "failed").length.toLocaleString()} hint="Refunded to wallet" />
      </StatGrid>

      {/* Filter pills + search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          id="admin-orders"
          value={filter}
          onChange={setFilter}
          options={tabs.map((t) => ({ value: t.id, label: t.label, count: t.count }))}
          className="max-w-full self-start overflow-x-auto"
        />
        <label className="relative flex items-center md:w-80">
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="pointer-events-none absolute left-4 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, email, product…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 rounded-full pl-10"
          />
        </label>
      </div>
      {/* Desktop table */}
      <div className="surface hidden overflow-hidden rounded-2xl p-1.5 md:block">
        <Table>
          <TableHeader>
            <TableRow >
              <TableHead>Type</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Product / Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                  No orders match
                </TableCell>
              </TableRow>
            ) : (
              shown.map((o) => (
                <TableRow key={`${o.type}-${o.id}`} >
                  <TableCell className="capitalize">{o.type}</TableCell>
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell>{o.userEmail ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {o.type === "marketplace" ? o.title ?? "—" : o.serviceName ?? o.link ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell>
                    {formatAmount(o.amount)} {o.currency}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(o.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {o.status === "manual_review" && o.type === "marketplace" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setFulfillingOrder(o);
                          setCredentials("");
                        }}
                      >
                       <HugeiconsIcon icon={CheckmarkBadge01Icon} className="mr-1 size-3" />
                       Fulfill
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {shown.length === 0 ? (
          <div className="surface rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No orders match
          </div>
        ) : (
          shown.map((o) => (
            <div key={`${o.type}-${o.id}`} className="space-y-3 surface rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium truncate max-w-[200px]">
                    {o.type === "marketplace" ? o.title ?? "—" : o.serviceName ?? o.link ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">{o.userEmail ?? "—"}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="capitalize">{o.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="font-medium">{formatAmount(o.amount)} {o.currency}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Date &amp; Time</p>
                  <p className="text-xs">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{o.id.slice(0, 8)}</span>
                {o.status === "manual_review" && o.type === "marketplace" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFulfillingOrder(o);
                      setCredentials("");
                    }}
                  >
                    <HugeiconsIcon icon={CheckmarkBadge01Icon} className="mr-1 size-3" />
                    Fulfill
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog 
        open={!!fulfillingOrder} 
        onOpenChange={(open) => !open && setFulfillingOrder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manual Fulfillment</AlertDialogTitle>
            <AlertDialogDescription>
              Provide the account credentials or delivery details for order <span className="font-mono">{fulfillingOrder?.id.slice(0, 8)}</span>. 
              These will be saved to the order and emailed to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <h4 className="mb-2 text-sm font-medium">{fulfillingOrder?.title}</h4>
            <Textarea
              className="resize-none"
              rows={6}
              placeholder="Username: test&#10;Password: password123&#10;Email: test@example.com&#10;Notes: Please change password immediately."
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              disabled={submitting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <Button disabled={submitting} onClick={handleFulfill}>
              {submitting ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} className="mr-2 size-4 animate-spin" />
                  Submitting
                </>
              ) : (
                "Fulfill Order"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
