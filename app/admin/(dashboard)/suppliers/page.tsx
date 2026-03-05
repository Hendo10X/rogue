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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface SupplierRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  balance: string;
}

function fetchSuppliers() {
  return fetch("/api/admin/suppliers")
    .then((r) => r.json())
    .then((data) => (Array.isArray(data) ? data : []));
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchSuppliers()
      .then(setSuppliers)
      .finally(() => setLoading(false));
  }, []);

  async function handleSyncListings() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-listings", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      const total = data.results?.reduce((s: number, r: { upserted: number }) => s + r.upserted, 0) ?? 0;
      toast.success(total > 0 ? `Synced ${total} listings` : "Sync complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSeedSuppliers() {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-suppliers", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Seed failed");
      toast.success(data.inserted?.length ? `Added ${data.inserted.length} suppliers` : "Suppliers ready");
      const next = await fetchSuppliers();
      setSuppliers(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedSuppliers}
            disabled={seeding}
          >
            {seeding ? (
              <>
                <Spinner className="mr-2 size-4" />
                Seeding...
              </>
            ) : (
              "Seed Suppliers"
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncListings}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <Spinner className="mr-2 size-4" />
                Syncing...
              </>
            ) : (
              "Sync Listings"
            )}
          </Button>
        </div>
      </div>
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
