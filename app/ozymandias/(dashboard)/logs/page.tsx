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

interface LogRow {
  id: string;
  title: string;
  platform: string;
  categoryName: string | null;
  price: string;
  currency: string;
  stock: number;
  status: string;
  hidden: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const selectClass =
  "h-10 rounded-full bg-white/[0.04] px-4 text-[0.8125rem] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] focus:outline-none focus:ring-2 focus:ring-ring/40";

export default function AdminLogsPage() {
  const [items, setItems] = useState<LogRow[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const searchRef = useSlashFocus();
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        status,
      });
      if (q.trim()) params.set("q", q.trim());
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/admin/listings/all?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load logs");
      setItems(Array.isArray(data.items) ? data.items : []);
      if (Array.isArray(data.platforms) && data.platforms.length) {
        setPlatforms(data.platforms);
      }
      setPagination(data.pagination ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [page, q, platform, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleVisibility(row: LogRow, nextVisible: boolean) {
    const hidden = !nextVisible;
    setTogglingId(row.id);
    // optimistic update
    setItems((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, hidden, status: hidden ? "inactive" : r.status }
          : r,
      ),
    );
    try {
      const res = await fetch(`/api/admin/listings/${row.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setItems((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, hidden: data.hidden, status: data.status }
            : r,
        ),
      );
      toast.success(
        data.hidden
          ? `"${row.title.slice(0, 40)}" hidden from storefront`
          : `"${row.title.slice(0, 40)}" shown in storefront`,
      );
    } catch (e) {
      // revert on failure
      setItems((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)),
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-col gap-1.5"><h1 className="text-2xl font-semibold tracking-[-0.03em]">Logs</h1></div>
          <p className="text-sm text-muted-foreground">
            Switch a log off to hide it from the storefront. Hidden logs stay
            hidden even after a supplier re-sync.
          </p>
        </div>
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
            placeholder="Search by title…"
            className="h-10 rounded-full pr-12 pl-4"
          />
          <kbd className="pointer-events-none absolute right-4 hidden h-5 min-w-5 items-center justify-center rounded-md bg-white/[0.06] px-1.5 font-mono text-[0.625rem] text-muted-foreground sm:inline-flex">
            /
          </kbd>
        </label>
        <select
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="all">All platforms</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
                  <TableHead>Log</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Show in store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => (
                    <TableRow key={r.id} >
                      <TableCell className="max-w-md">
                        <p className="truncate font-medium">{r.title}</p>
                        {r.categoryName && (
                          <p className="text-muted-foreground truncate text-xs">
                            {r.categoryName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{r.platform}</TableCell>
                      <TableCell>{r.stock}</TableCell>
                      <TableCell>
                        {r.hidden ? (
                          <Badge variant="secondary">Hidden</Badge>
                        ) : r.status === "active" ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {togglingId === r.id && (
                            <Spinner className="size-4" />
                          )}
                          <Switch
                            checked={!r.hidden}
                            disabled={togglingId === r.id}
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
                No logs found
              </div>
            ) : (
              items.map((r) => (
                <div key={r.id} className="space-y-3 surface rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{r.title}</p>
                    {r.hidden ? (
                      <Badge variant="secondary">Hidden</Badge>
                    ) : r.status === "active" ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Platform</p>
                      <p className="capitalize">{r.platform}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Stock</p>
                      <p>{r.stock}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-sm text-muted-foreground">
                      Show in storefront
                    </span>
                    <div className="flex items-center gap-2">
                      {togglingId === r.id && <Spinner className="size-4" />}
                      <Switch
                        checked={!r.hidden}
                        disabled={togglingId === r.id}
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
                {pagination.total} logs · page {pagination.page} of{" "}
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
