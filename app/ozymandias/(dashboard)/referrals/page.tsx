"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Loading03Icon,
  Refresh01Icon,
  Search01Icon,
  UserBlock01Icon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { useSlashFocus } from "@/lib/use-slash-focus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, PageHeader, SectionLabel, StatCard, StatGrid } from "@/components/page-header";

type Row = {
  id: string;
  code: string;
  status: string;
  flagReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  ipShared: number;
  rewardAmount: number | null;
  createdAt: string;
  rewardedAt: string | null;
  referrer: { id: string; name: string; email: string };
  referred: { id: string; name: string; email: string };
};

type Filter = "all" | "pending" | "rewarded" | "blocked" | "shared";

const PRESETS = [5, 10, 15, 20];

function naira(n: number) {
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const v =
    status === "rewarded" ? "default" : status === "blocked" ? "destructive" : status === "expired" ? "outline" : "secondary";
  return <Badge variant={v}>{status}</Badge>;
}

/** Shows the IP and, when more than one referral shares it, a warning chip. */
function IpCell({ row }: { row: Row }) {
  if (!row.ipAddress) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-xs">{row.ipAddress}</span>
      {row.ipShared > 1 && (
        <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[0.6875rem] text-destructive">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3" />
          {row.ipShared} accounts
        </span>
      )}
    </span>
  );
}

export default function AdminReferralsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const searchRef = useSlashFocus();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/referrals");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load referrals");
      setRows(data.referrals);
      setPercent(data.percent);
      setDraft(String(data.percent));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load referrals");
      setRows((r) => r ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePercent(value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Enter a percent between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setPercent(data.percent);
      setDraft(String(data.percent));
      toast.success(data.percent === 0 ? "Referral rewards turned off." : `Referral reward set to ${data.percent}%.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(row: Row, status: "pending" | "blocked") {
    setBusyId(row.id);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setRows((rs) =>
        (rs ?? []).map((r) =>
          r.id === row.id ? { ...r, status, flagReason: status === "blocked" ? "Blocked by admin" : null } : r
        )
      );
      toast.success(status === "blocked" ? "Referral blocked." : "Referral allowed — it will pay on their first deposit.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const all = rows ?? [];
  const totals = useMemo(() => {
    const paid = all.reduce((s, r) => s + (r.rewardAmount ?? 0), 0);
    return {
      total: all.length,
      rewarded: all.filter((r) => r.status === "rewarded").length,
      pending: all.filter((r) => r.status === "pending").length,
      blocked: all.filter((r) => r.status === "blocked").length,
      shared: all.filter((r) => r.ipShared > 1).length,
      paid,
    };
  }, [all]);

  const q = query.trim().toLowerCase();
  const shown = all.filter((r) => {
    if (filter === "shared" ? r.ipShared <= 1 : filter !== "all" && r.status !== filter) return false;
    if (!q) return true;
    return [r.referrer.email, r.referrer.name, r.referred.email, r.referred.name, r.ipAddress, r.code]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const draftNum = Number(draft);
  const dirty = draft.trim() !== "" && percent !== null && draftNum !== percent;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Referrals"
        description="Who invited whom, the IP each account signed up from, and what was paid."
        action={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <HugeiconsIcon icon={loading ? Loading03Icon : Refresh01Icon} className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Reward control */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-[inset_0_0_0_1px_rgb(255_140_60/0.14)]">
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(140deg,rgb(255_90_31/0.16),rgb(255_211_26/0.04)_60%,transparent)]" />
          <div className="relative flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium">Referral reward</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share of a referred user&apos;s first deposit paid to whoever invited them. Set 0 to turn rewards off.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-28">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-11 rounded-full pr-8 text-lg font-semibold tabular-nums"
                  aria-label="Referral percent"
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <Button disabled={!dirty || saving} onClick={() => void savePercent(draftNum)}>
                {saving ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> : null}
                Save
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft(String(p))}
                  className={cn(
                    "h-7 rounded-full px-3 text-xs transition-colors",
                    String(p) === draft
                      ? "bg-[#ff7a1a]/15 text-[#ffc08f] shadow-[inset_0_0_0_1px_rgb(255_140_60/0.4)]"
                      : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                  )}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <StatGrid className="lg:col-span-2 lg:grid-cols-2">
          <StatCard label="Referrals" value={totals.total.toLocaleString()} hint={`${totals.pending} waiting on a first deposit`} />
          <StatCard label="Paid out" value={naira(totals.paid)} hint={`${totals.rewarded} rewarded`} />
          <StatCard
            label="Blocked"
            value={totals.blocked.toLocaleString()}
            tone={totals.blocked > 0 ? "danger" : undefined}
            hint="Same IP as the referrer, or by you"
          />
          <StatCard
            label="Shared IPs"
            value={totals.shared.toLocaleString()}
            tone={totals.shared > 0 ? "danger" : undefined}
            hint="Referrals from an IP used more than once"
          />
        </StatGrid>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>All referrals</SectionLabel>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Segmented
            id="admin-referrals"
            value={filter}
            onChange={setFilter}
            size="sm"
            className="max-w-full self-start overflow-x-auto"
            options={[
              { value: "all", label: "All", count: totals.total },
              { value: "pending", label: "Pending", count: totals.pending },
              { value: "rewarded", label: "Rewarded", count: totals.rewarded },
              { value: "blocked", label: "Blocked", count: totals.blocked },
              { value: "shared", label: "Shared IP", count: totals.shared },
            ]}
          />
          <label className="relative flex items-center md:w-80">
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="pointer-events-none absolute left-4 size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search email, IP or code…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 rounded-full pl-10"
            />
          </label>
        </div>

        {rows === null ? (
          <div className="surface flex min-h-[200px] items-center justify-center rounded-2xl">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? "No referrals yet" : "Nothing matches"}
            description={
              all.length === 0
                ? "When someone signs up through a referral link it shows up here."
                : "Try another filter or a shorter search."
            }
          />
        ) : (
          <ul className="surface flex flex-col gap-0.5 rounded-2xl p-1.5">
            {shown.map((r) => (
              <li
                key={r.id}
                className="grid gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.03] lg:grid-cols-12 lg:items-center"
              >
                <div className="min-w-0 lg:col-span-3">
                  <p className="text-xs text-muted-foreground">Referrer</p>
                  <p className="truncate text-[0.8125rem] font-medium">{r.referrer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.referrer.email}</p>
                </div>
                <div className="min-w-0 lg:col-span-3">
                  <p className="text-xs text-muted-foreground">Signed up</p>
                  <p className="truncate text-[0.8125rem] font-medium">{r.referred.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.referred.email}</p>
                </div>
                <div className="min-w-0 lg:col-span-3">
                  <p className="text-xs text-muted-foreground">IP · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</p>
                  <IpCell row={r} />
                  {r.flagReason && <p className="mt-0.5 text-xs text-destructive">{r.flagReason}</p>}
                </div>
                <div className="flex items-center justify-between gap-3 lg:col-span-3 lg:justify-end">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.rewardAmount != null && (
                      <span className="text-[0.8125rem] font-semibold tabular-nums">{naira(r.rewardAmount)}</span>
                    )}
                  </div>
                  {r.status === "pending" && (
                    <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => void setStatus(r, "blocked")}>
                      <HugeiconsIcon icon={UserBlock01Icon} strokeWidth={2} />
                      Block
                    </Button>
                  )}
                  {r.status === "blocked" && (
                    <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => void setStatus(r, "pending")}>
                      <HugeiconsIcon icon={UserCheck01Icon} strokeWidth={2} />
                      Allow
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
