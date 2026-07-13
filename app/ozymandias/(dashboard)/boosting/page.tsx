"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface ServiceRow {
  service: number;
  name: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  isHidden: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const selectClass =
  "h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function AdminBoostingPage() {
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (q.trim()) params.set("q", q.trim());
      if (category !== "all") params.set("category", category);
      const res = await fetch(
        `/api/admin/boosting/services?${params.toString()}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load services");
      setItems(Array.isArray(data.items) ? data.items : []);
      if (Array.isArray(data.categories) && data.categories.length) {
        setCategories(data.categories);
      }
      setPagination(data.pagination ?? null);
      setHiddenCount(data.hiddenCount ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [page, q, category]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleVisibility(row: ServiceRow, nextVisible: boolean) {
    const hidden = !nextVisible;
    setTogglingId(row.service);
    setItems((prev) =>
      prev.map((r) =>
        r.service === row.service ? { ...r, isHidden: hidden } : r,
      ),
    );
    try {
      const res = await fetch("/api/admin/boosting/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: row.service, hidden }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setHiddenCount(data.hiddenCount ?? hiddenCount);
      toast.success(
        hidden
          ? `"${row.name.slice(0, 40)}" hidden from storefront`
          : `"${row.name.slice(0, 40)}" shown in storefront`,
      );
    } catch (e) {
      setItems((prev) =>
        prev.map((r) =>
          r.service === row.service ? { ...r, isHidden: row.isHidden } : r,
        ),
      );
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setTogglingId(null);
    }
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Boosting services</h1>
        <p className="text-muted-foreground text-sm">
          Switch a service off to hide it from the storefront. {hiddenCount}{" "}
          currently hidden.
        </p>
      </div>

      <form
        onSubmit={onSearchSubmit}
        className="flex flex-wrap items-center gap-2"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or ID…"
          className="h-9 w-56"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm" disabled={loading}>
          Search
        </Button>
      </form>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Show in store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8">
                      No services found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => (
                    <TableRow key={r.service} className="border-b">
                      <TableCell className="font-mono text-xs">
                        {r.service}
                      </TableCell>
                      <TableCell className="max-w-sm truncate">
                        {r.name}
                        {r.isHidden && (
                          <Badge variant="secondary" className="ml-2">
                            Hidden
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {r.category}
                      </TableCell>
                      <TableCell>{r.rate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {togglingId === r.service && (
                            <Spinner className="size-4" />
                          )}
                          <Switch
                            checked={!r.isHidden}
                            disabled={togglingId === r.service}
                            onCheckedChange={(v) => toggleVisibility(r, v)}
                            aria-label="Show in storefront"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {items.length === 0 ? (
              <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                No services found
              </div>
            ) : (
              items.map((r) => (
                <div
                  key={r.service}
                  className="rounded-lg border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{r.name}</p>
                    {r.isHidden && <Badge variant="secondary">Hidden</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">ID</p>
                      <p className="font-mono text-xs">{r.service}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Category</p>
                      <p className="truncate text-xs">{r.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Rate</p>
                      <p>{r.rate}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">
                      Show in storefront
                    </span>
                    <div className="flex items-center gap-2">
                      {togglingId === r.service && <Spinner className="size-4" />}
                      <Switch
                        checked={!r.isHidden}
                        disabled={togglingId === r.service}
                        onCheckedChange={(v) => toggleVisibility(r, v)}
                        aria-label="Show in storefront"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {pagination.total} services · page {pagination.page} of{" "}
                {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
