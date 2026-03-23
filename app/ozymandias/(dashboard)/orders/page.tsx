"use client";

import { useEffect, useState } from "react";
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
import { CheckmarkBadge01Icon, Loading03Icon } from "@hugeicons/core-free-icons";

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
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    completed: "bg-green-500/15 text-green-600 dark:text-green-400",
    failed: "bg-red-500/15 text-red-600 dark:text-red-400",
    manual_review: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
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
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Spinner className="size-4" /> Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-background shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
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
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                  No orders yet
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={`${o.type}-${o.id}`} className="border-b">
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
                    {o.amount} {o.currency}
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
        {orders.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
            No orders yet
          </div>
        ) : (
          orders.map((o) => (
            <div key={`${o.type}-${o.id}`} className="rounded-lg border bg-card p-4 space-y-3">
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
                  <p className="font-medium">{o.amount} {o.currency}</p>
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
