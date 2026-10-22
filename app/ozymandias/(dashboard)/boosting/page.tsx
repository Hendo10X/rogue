"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Loading03Icon,
  Search01Icon,
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
import { PageHeader, StatCard, StatGrid } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ServiceRow {
  service: number;
  name: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  isHidden: boolean;
  profit: number | null;
  sellRate: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type Status = "all" | "visible" | "hidden" | "custom";

const naira = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

/** Click the profit to edit it in place; Enter saves, Esc cancels, empty resets. */
function ProfitCell({
  row,
  globalMarkup,
  onSave,
}: {
  row: ServiceRow;
  globalMarkup: number;
  onSave: (profit: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

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
          step={10}
          value={value}
          placeholder={String(globalMarkup)}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          onBlur={() => !busy && setEditing(false)}
          className="h-8 w-24 rounded-lg px-2 text-[0.8125rem]"
          aria-label="Profit per 1,000"
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
      className="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-left tabular-nums transition-colors hover:bg-white/[0.05]"
      title="Click to set this service's profit"
    >
      <span className={cn(row.profit === null && "text-muted-foreground")}>{naira(row.profit ?? globalMarkup)}</span>
      {row.profit === null ? (
        <span className="text-[0.6875rem] text-muted-foreground/60">global</span>
      ) : (
        <Badge variant="default">custom</Badge>
      )}
    </button>
  );
}

export default function AdminBoostingPage() {
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [customCount, setCustomCount] = useState(0);
  const [globalMarkup, setGlobalMarkup] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkProfit, setBulkProfit] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const searchRef = useSlashFocus();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(1);

  // Debounce typing so every keystroke doesn't refetch 700+ services.
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
      const params = new URLSearchParams({ page: String(page), limit: "50", status });
      if (query) params.set("q", query);
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/admin/boosting/services?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load services");
      setItems(Array.isArray(data.items) ? data.items : []);
      if (Array.isArray(data.categories) && data.categories.length) setCategories(data.categories);
      setPagination(data.pagination ?? null);
      setHiddenCount(data.hiddenCount ?? 0);
      setCustomCount(data.customCount ?? 0);
      setGlobalMarkup(Number(data.globalMarkup ?? 0));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [page, query, category, status]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new page or filter starts with nothing selected.
  useEffect(() => setSelected(new Set()), [page, query, category, status]);

  async function patch(ids: number[], change: { hidden: boolean } | { profit: number | null }) {
    const res = await fetch("/api/admin/boosting/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, ...change }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Update failed");
    if (typeof data.hiddenCount === "number") setHiddenCount(data.hiddenCount);
    if (typeof data.customCount === "number") setCustomCount(data.customCount);
  }

  function applyLocal(ids: number[], change: { hidden: boolean } | { profit: number | null }) {
    const idSet = new Set(ids);
    setItems((prev) =>
      prev.map((r) => {
        if (!idSet.has(r.service)) return r;
        if ("hidden" in change) return { ...r, isHidden: change.hidden };
        const profit = change.profit;
        return { ...r, profit, sellRate: (parseFloat(r.rate) || 0) + (profit ?? globalMarkup) };
      })
    );
  }

  async function toggleOne(row: ServiceRow, visible: boolean) {
    applyLocal([row.service], { hidden: !visible });
    try {
      await patch([row.service], { hidden: !visible });
    } catch (e) {
      applyLocal([row.service], { hidden: row.isHidden });
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function saveProfit(row: ServiceRow, profit: number | null) {
    try {
      await patch([row.service], { profit });
      applyLocal([row.service], { profit });
      toast.success(profit === null ? "Using the global markup again." : `Profit set to ${naira(profit)} per 1,000.`);
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
      applyLocal(ids, change);
      toast.success(`${label} · ${ids.length} service${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      setBulkProfit("");
      if (status !== "all") void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBulkBusy(false);
    }
  }

  const allOnPage = items.length > 0 && items.every((r) => selected.has(r.service));
  const someOnPage = items.some((r) => selected.has(r.service));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) items.forEach((r) => next.delete(r.service));
      else items.forEach((r) => next.add(r.service));
      return next;
    });
  const toggleRow = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulkProfitNum = Number(bulkProfit);
  const bulkProfitValid = bulkProfit.trim() !== "" && Number.isFinite(bulkProfitNum) && bulkProfitNum >= 0;
  const total = pagination?.total ?? 0;
  const statusOptions = useMemo(
    () => [
      { value: "all" as const, label: "All" },
      { value: "visible" as const, label: "Visible" },
      { value: "hidden" as const, label: "Hidden", count: hiddenCount },
      { value: "custom" as const, label: "Custom profit", count: customCount },
    ],
    [hiddenCount, customCount]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Boosting services"
        description="Hide services from the store, and set a profit per service or for many at once. Services without their own profit use the global boosting markup from Settings."
      />

      <StatGrid>
        <StatCard label="Global markup" value={`${naira(globalMarkup)}`} hint="Per 1,000 · set in Settings" />
        <StatCard label="Custom profit" value={customCount.toLocaleString()} hint="Services with their own profit" />
        <StatCard label="Hidden" value={hiddenCount.toLocaleString()} hint="Not shown in the store" />
        <StatCard label="Showing" value={total.toLocaleString()} hint="Match the current filters" />
      </StatGrid>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="relative flex flex-1 items-center">
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="pointer-events-none absolute left-4 size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, category or ID…"
              className="h-10 rounded-full pr-12 pl-10"
            />
            <kbd className="pointer-events-none absolute right-4 hidden h-5 min-w-5 items-center justify-center rounded-md bg-white/[0.06] px-1.5 font-mono text-[0.625rem] text-muted-foreground sm:inline-flex">
              /
            </kbd>
          </label>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10! w-full rounded-full px-4 md:w-64">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Segmented
          id="admin-boosting-status"
          size="sm"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={statusOptions}
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
                  step={10}
                  value={bulkProfit}
                  onChange={(e) => setBulkProfit(e.target.value)}
                  placeholder="Profit ₦"
                  className="h-8 w-28 rounded-full px-3 text-[0.8125rem]"
                  aria-label="Profit per 1,000 for selected"
                />
                <Button size="sm" type="submit" disabled={bulkBusy || !bulkProfitValid}>
                  Set profit
                </Button>
              </form>
              <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => void bulk({ profit: null }, "Back to global markup")}>
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
        <div className="surface rounded-2xl px-6 py-14 text-center text-sm text-muted-foreground">
          No services match these filters.
        </div>
      ) : (
        <div className={cn("surface overflow-hidden rounded-2xl p-1.5 transition-opacity", loading && "opacity-60")}>
          {/* Header row (desktop) */}
          <div className="hidden grid-cols-[2rem_minmax(0,1fr)_6rem_9rem_7rem_4.5rem] items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
            <Checkbox
              checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              aria-label="Select all on this page"
            />
            <span>Service</span>
            <span className="text-right">Supplier</span>
            <span>Profit / 1k</span>
            <span className="text-right">Sells at</span>
            <span className="text-right">Store</span>
          </div>
          <ul className="flex flex-col gap-0.5">
            {items.map((r) => {
              const on = selected.has(r.service);
              return (
                <li
                  key={r.service}
                  className={cn(
                    "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl px-3 py-3 transition-colors md:grid-cols-[2rem_minmax(0,1fr)_6rem_9rem_7rem_4.5rem]",
                    on ? "bg-[#ff7a1a]/[0.07]" : "hover:bg-white/[0.03]",
                    r.isHidden && "opacity-60"
                  )}
                >
                  <Checkbox checked={on} onCheckedChange={() => toggleRow(r.service)} aria-label={`Select ${r.name}`} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[0.8125rem] leading-snug font-medium md:line-clamp-1">{r.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      <span className="font-mono">#{r.service}</span> · {r.category}
                    </p>
                  </div>
                  <span className="text-right text-[0.8125rem] text-muted-foreground tabular-nums max-md:hidden">
                    {naira(parseFloat(r.rate) || 0)}
                  </span>
                  <div className="col-start-2 max-md:row-start-2 md:col-start-auto">
                    <ProfitCell row={r} globalMarkup={globalMarkup} onSave={(p) => saveProfit(r, p)} />
                  </div>
                  <span className="text-right text-[0.8125rem] font-semibold tabular-nums max-md:col-start-3 max-md:row-start-1">
                    {naira(r.sellRate)}
                  </span>
                  <div className="flex justify-end max-md:col-start-3 max-md:row-start-2">
                    <Switch
                      checked={!r.isHidden}
                      onCheckedChange={(v) => void toggleOne(r, v)}
                      aria-label={r.isHidden ? "Show in store" : "Hide from store"}
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
