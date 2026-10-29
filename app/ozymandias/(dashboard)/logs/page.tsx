"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Loading03Icon,
  Search01Icon,
  StarIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { useSlashFocus } from "@/lib/use-slash-focus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Segmented } from "@/components/ui/segmented";
import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogRow {
  id: string;
  title: string;
  platform: string;
  categoryName: string | null;
  price: string;
  costNgn: number | null;
  profit: number | null;
  manual: boolean;
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

type Filter = "all" | "active" | "hidden" | "custom";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** Click to set a fixed profit; empty resets to tiered pricing. Manual logs keep their own price. */
function ProfitCell({ row, onSave }: { row: LogRow; onSave: (profit: number | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  if (row.manual) {
    return <span className="px-2 text-xs text-muted-foreground">manual price</span>;
  }

  async function commit() {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      toast.error("Profit must be ₦0 or more.");
      return;
    }
    setBusy(true);
    await onSave(next);
    setBusy(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void commit();
        }}
        className="flex items-center gap-1"
      >
        <Input
          autoFocus
          type="number"
          inputMode="decimal"
          min={0}
          step={100}
          value={value}
          placeholder="tiered"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          onBlur={() => !busy && setEditing(false)}
          className="h-8 w-24 rounded-lg px-2 text-[0.8125rem]"
          aria-label="Profit"
        />
        {busy && <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin text-muted-foreground" />}
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(row.profit === null ? "" : String(row.profit));
        setEditing(true);
      }}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 tabular-nums transition-colors hover:bg-white/[0.05]"
      title="Click to set this listing's profit"
    >
      {row.profit === null ? (
        <span className="text-muted-foreground">tiered</span>
      ) : (
        <>
          <span>{naira(row.profit)}</span>
          <Badge variant="default">custom</Badge>
        </>
      )}
    </button>
  );
}

export default function AdminLogsPage() {
  const [items, setItems] = useState<LogRow[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [customCount, setCustomCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProfit, setBulkProfit] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [featured, setFeatured] = useState<string[]>([]);
  const [maxFeatured, setMaxFeatured] = useState(2);

  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const searchRef = useSlashFocus();
  const [platform, setPlatform] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (query) params.set("q", query);
      if (platform !== "all") params.set("platform", platform);
      if (filter === "active") params.set("status", "active");
      if (filter === "hidden") params.set("hiddenOnly", "1");
      if (filter === "custom") params.set("customOnly", "1");
      const res = await fetch(`/api/admin/listings/all?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load logs");
      setItems(Array.isArray(data.items) ? data.items : []);
      if (Array.isArray(data.platforms) && data.platforms.length) setPlatforms(data.platforms);
      setPagination(data.pagination ?? null);
      setCustomCount(data.customCount ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [page, query, platform, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch("/api/admin/featured")
      .then((r) => r.json())
      .then((d) => {
        setFeatured(d.ids ?? []);
        setMaxFeatured(d.max ?? 2);
      })
      .catch(() => {});
  }, []);

  async function toggleFeatured(id: string) {
    const next = featured.includes(id) ? featured.filter((x) => x !== id) : [...featured, id];
    if (next.length > maxFeatured) return toast.error(`You can feature up to ${maxFeatured} logs. Unstar one first.`);
    try {
      const res = await fetch("/api/admin/featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setFeatured(data.ids ?? next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update featured logs");
    }
  }

  // A new page or filter starts with nothing selected.
  useEffect(() => setSelected(new Set()), [page, query, platform, filter]);

  async function patch(ids: string[], change: { hidden: boolean } | { profit: number | null }) {
    const res = await fetch("/api/admin/listings/all", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, ...change }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Update failed");
    if (typeof data.customCount === "number") setCustomCount(data.customCount);
  }

  async function toggleOne(row: LogRow, visible: boolean) {
    try {
      const res = await fetch(`/api/admin/listings/${row.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !visible }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, hidden: data.hidden, status: data.status } : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function saveProfit(row: LogRow, profit: number | null) {
    try {
      await patch([row.id], { profit });
      toast.success(profit === null ? "Back to tiered pricing." : `Profit set to ${naira(profit)}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function bulk(change: { hidden: boolean } | { profit: number | null }, label: string) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      await patch(ids, change);
      toast.success(`${label} · ${ids.length} log${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      setBulkProfit("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBulkBusy(false);
    }
  }

  const allOnPage = items.length > 0 && items.every((r) => selected.has(r.id));
  const someOnPage = items.some((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) items.forEach((r) => next.delete(r.id));
      else items.forEach((r) => next.add(r.id));
      return next;
    });
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const bulkProfitNum = Number(bulkProfit);
  const bulkProfitValid = bulkProfit.trim() !== "" && Number.isFinite(bulkProfitNum) && bulkProfitNum >= 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logs"
        description="Hide logs from the store, star up to 2 logs to pin them in Popular on the marketplace, and set a fixed profit on any supplier log. Logs without their own profit use the tiered pricing from Settings; manual logs keep the price you set for them."
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="relative flex flex-1 items-center">
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="pointer-events-none absolute left-4 size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title…"
              className="h-10 rounded-full pr-12 pl-10"
            />
            <kbd className="pointer-events-none absolute right-4 hidden h-5 min-w-5 items-center justify-center rounded-md bg-white/[0.06] px-1.5 font-mono text-[0.625rem] text-muted-foreground sm:inline-flex">
              /
            </kbd>
          </label>
          <Select
            value={platform}
            onValueChange={(v) => {
              setPlatform(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10! w-full rounded-full px-4 md:w-56">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Segmented
          id="admin-logs-filter"
          size="sm"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "In store" },
            { value: "hidden", label: "Hidden" },
            { value: "custom", label: "Custom profit", count: customCount },
          ]}
          className="max-w-full self-start overflow-x-auto"
        />
      </div>

      {/* Bulk bar — appears once something is selected. */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="sticky top-28 z-30 flex flex-col gap-2 rounded-2xl bg-[oklch(0.22_0.02_50)] p-3 shadow-[0_0_0_1px_rgb(255_140_60/0.25),0_20px_50px_-15px_rgb(0_0_0/0.7)] md:flex-row md:items-center"
          >
            <div className="flex items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                aria-label="Clear selection"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
              </button>
              <span className="text-[0.8125rem] font-medium">{selected.size} selected</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:ml-auto">
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => void bulk({ hidden: false }, "Shown in store")}>
                <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
                Show
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => void bulk({ hidden: true }, "Hidden from store")}>
                <HugeiconsIcon icon={ViewOffSlashIcon} strokeWidth={2} />
                Hide
              </Button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (bulkProfitValid) void bulk({ profit: bulkProfitNum }, `Profit set to ${naira(bulkProfitNum)}`);
                }}
                className="flex items-center gap-1.5"
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={100}
                  value={bulkProfit}
                  onChange={(e) => setBulkProfit(e.target.value)}
                  placeholder="Profit ₦"
                  className="h-8 w-28 rounded-full px-3 text-[0.8125rem]"
                  aria-label="Profit for selected logs"
                />
                <Button size="sm" type="submit" disabled={bulkBusy || !bulkProfitValid}>
                  Set profit
                </Button>
              </form>
              <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => void bulk({ profit: null }, "Back to tiered pricing")}>
                Reset profit
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && items.length === 0 ? (
        <div className="surface flex min-h-[240px] items-center justify-center rounded-2xl">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface rounded-2xl px-6 py-14 text-center text-sm text-muted-foreground">No logs match these filters.</div>
      ) : (
        <div className={cn("surface overflow-hidden rounded-2xl p-1.5 transition-opacity", loading && "opacity-60")}>
          <div className="hidden grid-cols-[2rem_minmax(0,1fr)_6rem_9rem_6.5rem_4rem_6rem] items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
            <Checkbox
              checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              aria-label="Select all on this page"
            />
            <span>Log</span>
            <span className="text-right">Cost</span>
            <span>Profit</span>
            <span className="text-right">Sells at</span>
            <span className="text-right">Stock</span>
            <span className="text-right">Store</span>
          </div>
          <ul className="flex flex-col gap-0.5">
            {items.map((r) => {
              const on = selected.has(r.id);
              return (
                <li
                  key={r.id}
                  className={cn(
                    "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl px-3 py-3 transition-colors md:grid-cols-[2rem_minmax(0,1fr)_6rem_9rem_6.5rem_4rem_6rem]",
                    on ? "bg-[#ff7a1a]/[0.07]" : "hover:bg-white/[0.03]",
                    r.hidden && "opacity-60"
                  )}
                >
                  <Checkbox checked={on} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.title}`} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[0.8125rem] leading-snug font-medium md:line-clamp-1">{r.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span className="capitalize">{r.platform.toLowerCase()}</span>
                      {r.categoryName && <span>· {r.categoryName}</span>}
                      {r.manual && <Badge variant="secondary">manual</Badge>}
                      <span className="md:hidden">· {r.stock.toLocaleString()} in stock</span>
                    </p>
                  </div>
                  <span className="text-right text-[0.8125rem] text-muted-foreground tabular-nums max-md:hidden">
                    {r.costNgn === null ? "—" : naira(r.costNgn)}
                  </span>
                  <div className="col-start-2 max-md:row-start-2 md:col-start-auto">
                    <ProfitCell row={r} onSave={(p) => saveProfit(r, p)} />
                  </div>
                  <span className="text-right text-[0.8125rem] font-semibold tabular-nums max-md:col-start-3 max-md:row-start-1">
                    {naira(parseFloat(r.price) || 0)}
                  </span>
                  <span className="text-right text-[0.8125rem] tabular-nums max-md:hidden">{r.stock.toLocaleString()}</span>
                  <div className="flex items-center justify-end gap-2 max-md:col-start-3 max-md:row-start-2">
                    <button
                      type="button"
                      aria-label={featured.includes(r.id) ? "Remove from Popular" : "Show in Popular"}
                      title={featured.includes(r.id) ? "In Popular — click to remove" : "Show in Popular on the marketplace"}
                      onClick={() => void toggleFeatured(r.id)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]",
                        featured.includes(r.id) ? "text-amber-400" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <HugeiconsIcon icon={StarIcon} strokeWidth={1.75} className={cn("size-4", featured.includes(r.id) && "fill-current")} />
                    </button>
                    <Switch
                      checked={!r.hidden}
                      onCheckedChange={(v) => void toggleOne(r, v)}
                      aria-label={r.hidden ? "Show in store" : "Hide from store"}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            Previous
          </Button>
          <span className="px-3 text-[0.8125rem] text-muted-foreground tabular-nums">
            {page} / {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            Next
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
        </div>
      )}
    </div>
  );
}
