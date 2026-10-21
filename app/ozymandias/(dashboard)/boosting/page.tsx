"use client";

import { useSlashFocus } from "@/lib/use-slash-focus";
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
  "h-10 rounded-full bg-white/[0.04] px-4 text-[0.8125rem] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] focus:outline-none focus:ring-2 focus:ring-ring/40";

export default function AdminBoostingPage() {
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [q, setQ] = useState("");
  const searchRef = useSlashFocus();
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
        <div className="flex flex-col gap-1.5"><h1 className="text-2xl font-semibold tracking-[-0.03em]">Boosting services</h1></div>
        <p className="text-sm text-muted-foreground">
          Switch a service off to hide it from the storefront. {hiddenCount}{" "}
          currently hidden.
        </p>
      </div>

      <form
        onSubmit={onSearchSubmit}
        className="flex flex-col gap-2 md:flex-row md:items-center"
      >
        <label className="relative flex flex-1 items-center">
          <Input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or ID…"
            className="h-10 rounded-full pr-12 pl-4"
          />
          <kbd className="pointer-events-none absolute right-4 hidden h-5 min-w-5 items-center justify-center rounded-md bg-white/[0.06] px-1.5 font-mono text-[0.625rem] text-muted-foreground sm:inline-flex">
            /
          </kbd>
        </label>
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
        <Button type="submit" variant="ghost" disabled={loading} className="h-10 px-5">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="surface flex min-h-[240px] items-center justify-center rounded-2xl">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="surface hidden overflow-hidden rounded-2xl p-1.5 md:block">
            <Table>
              <TableHeader>
                <TableRow >
                  <TableHead>ID</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Show in store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-8">
                      No services found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => (
                    <TableRow key={r.service} >
                      <TableCell className="font-mono text-xs">
                        {r.service}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {r.category}
                        </p>
                      </TableCell>
                      <TableCell>
                        {r.isHidden ? (
                          <Badge variant="secondary">Hidden</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </TableCell>
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
              <div className="surface rounded-2xl p-10 text-center text-sm text-muted-foreground">
                No services found
              </div>
            ) : (
              items.map((r) => (
                <div
                  key={r.service}
                  className="space-y-3 surface rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{r.name}</p>
                    {r.isHidden ? (
                      <Badge variant="secondary">Hidden</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">ID</p>
                      <p className="font-mono text-xs">{r.service}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Category</p>
                      <p className="truncate text-xs">{r.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3">
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
              <p className="text-sm text-muted-foreground">
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
