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

interface SupplierRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  balance: string;
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/suppliers")
      .then((r) => r.json())
      .then((data) => {
        setSuppliers(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Suppliers</h1>
      <div className="overflow-x-auto rounded-lg border bg-background shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8">
                  No suppliers configured
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id} className="border-b">
                  <TableCell>{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.slug}</TableCell>
                  <TableCell>{s.status}</TableCell>
                  <TableCell>{s.balance}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
