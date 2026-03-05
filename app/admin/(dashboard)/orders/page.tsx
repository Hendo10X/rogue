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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <div className="overflow-x-auto rounded-lg border bg-background shadow-none">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8">
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
                  <TableCell>{o.status}</TableCell>
                  <TableCell>
                    {o.amount} {o.currency}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(o.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
