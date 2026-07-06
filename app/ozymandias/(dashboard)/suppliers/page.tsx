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
  low?: boolean;
}

function fetchSuppliers() {
  return fetch("/api/admin/suppliers")
    .then((r) => r.json())
    .then((data) => (Array.isArray(data) ? data : []));
}

interface SyncResult {
  supplierId: string;
  upserted: number;
  total: number;
  error?: string;
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    fetchSuppliers()
      .then(setSuppliers)
      .finally(() => setLoading(false));
  }, []);

  async function handleSeedSuppliers() {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-suppliers", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Seed failed");
      const added = data.inserted?.length ?? 0;
      const refreshed = data.updated?.length ?? 0;
      toast.success(
        added || refreshed
          ? `Suppliers ready (${added} added, ${refreshed} updated)`
          : "Suppliers ready",
      );
      const next = await fetchSuppliers();
      setSuppliers(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  async function handleResync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-listings", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Re-sync failed");

      const results: SyncResult[] = Array.isArray(data.results) ? data.results : [];
      const totalUpserted = results.reduce((sum, r) => sum + (r.upserted ?? 0), 0);
      const failed = results.filter((r) => r.error);

      if (failed.length > 0) {
        toast.warning(
          `Synced ${totalUpserted} listing${totalUpserted === 1 ? "" : "s"}; ${failed.length} supplier${failed.length === 1 ? "" : "s"} failed: ${failed
            .map((r) => `${r.supplierId} (${r.error})`)
            .join(", ")}`
        );
      } else {
        toast.success(
          `Re-synced ${totalUpserted} listing${totalUpserted === 1 ? "" : "s"} from ${results.length} supplier${results.length === 1 ? "" : "s"}`
        );
      }

      const next = await fetchSuppliers();
      setSuppliers(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleHideOutOfStock() {
    if (
      !window.confirm(
        "Hide all out-of-stock products from the marketplace? Restocked items come back on the next sync.",
      )
    ) {
      return;
    }
    setHiding(true);
    try {
      const res = await fetch("/api/admin/listings/deactivate-zero-stock", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to hide products");
      const n = data.deactivated ?? 0;
      toast.success(
        n > 0
          ? `Hid ${n} out-of-stock product${n === 1 ? "" : "s"}`
          : "No out-of-stock products to hide",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to hide products");
    } finally {
      setHiding(false);
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
            disabled={seeding || syncing || hiding}
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
            onClick={handleHideOutOfStock}
            disabled={hiding || seeding || syncing}
          >
            {hiding ? (
              <>
                <Spinner className="mr-2 size-4" />
                Hiding...
              </>
            ) : (
              "Hide out-of-stock"
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleResync}
            disabled={syncing || seeding}
          >
            {syncing ? (
              <>
                <Spinner className="mr-2 size-4" />
                Re-syncing...
              </>
            ) : (
              "Re-sync Listings"
            )}
          </Button>
        </div>
      </div>
      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-background shadow-none">
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
                  <TableCell>
                    <span className={s.low ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                      {s.balance}
                    </span>
                    {s.low && (
                      <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                        Low — top up
                      </span>
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
        {suppliers.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
            No suppliers configured
          </div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.name}</p>
                <span className="text-xs capitalize rounded-full bg-muted px-2 py-0.5">{s.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Slug</p>
                  <p className="font-mono text-xs">{s.slug}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Balance</p>
                  <p className={s.low ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                    {s.balance}
                    {s.low && " · Low"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
