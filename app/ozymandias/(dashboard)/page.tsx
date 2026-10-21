"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Loading03Icon, Refresh01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { PageHeader, SectionLabel, StatCard, StatGrid } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Stats {
  userCount: number;
  newUsersWeek: number;
  newUsersMonth: number;
  revenueWeek: string;
  revenueMonth: string;
  revenueTotal: string;
  ordersWeek: number;
  ordersMonth: number;
}

interface IpEntry {
  ip: string;
  userAgent: string;
  timestamp: string;
  adminId: string;
}

interface SupplierBalance {
  id: string;
  name: string;
  slug: string;
  status: string;
  balance: string;
  low?: boolean;
}

function fmt(n: string) {
  return `₦${parseFloat(n).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const SHORTCUTS = [
  { href: "/ozymandias/orders", label: "Fulfil pending orders", hint: "Marketplace & boosting" },
  { href: "/ozymandias/logs", label: "Manage log listings", hint: "Visibility, stock, pricing" },
  { href: "/ozymandias/suppliers", label: "Supplier health", hint: "Sync, balances, status" },
  { href: "/ozymandias/settings", label: "Site settings", hint: "Markup, announcements, security" },
];

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ipLog, setIpLog] = useState<IpEntry[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<SupplierBalance[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSuppliers = useCallback(async (announce = false) => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/admin/suppliers");
      const d = await r.json();
      setSupplierBalances(Array.isArray(d) ? d : []);
      if (announce) toast.success("Balances updated.");
    } catch {
      if (announce) toast.error("Could not reach the server. Try again.");
      setSupplierBalances((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch((e) => console.error("Failed to fetch stats", e));

    fetch("/api/admin/ip-log")
      .then((r) => r.json())
      .then((d) => setIpLog(Array.isArray(d) ? d.slice(0, 20) : []))
      .catch(() => {});

    void loadSuppliers();
  }, [loadSuppliers]);

  const loading = stats === null;
  const dash = <span className="inline-block h-5 w-16 animate-pulse bg-muted" />;
  const lowCount = supplierBalances?.filter((s) => s.low).length ?? 0;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Business at a glance: users, revenue, and supplier float."
        action={
          <Button asChild variant="outline" className="eyebrow">
            <Link href="/ozymandias/orders">
              Orders
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-2">
        <SectionLabel>Business</SectionLabel>
        <StatGrid>
          <StatCard
            label="Users"
            value={loading ? dash : stats.userCount.toLocaleString()}
            hint={loading ? "…" : `+${stats.newUsersWeek} this week · +${stats.newUsersMonth} this month`}
          />
          <StatCard
            label="Revenue · 7 days"
            value={loading ? dash : fmt(stats.revenueWeek)}
            hint={loading ? "…" : `${stats.ordersWeek} orders`}
          />
          <StatCard
            label="Revenue · 30 days"
            value={loading ? dash : fmt(stats.revenueMonth)}
            hint={loading ? "…" : `${stats.ordersMonth} orders`}
          />
          <StatCard
            label="Total revenue"
            value={loading ? dash : fmt(stats.revenueTotal)}
            hint="All-time deposits"
          />
        </StatGrid>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel
          action={
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void loadSuppliers(true)}
              disabled={refreshing}
              className="eyebrow text-muted-foreground"
            >
              <HugeiconsIcon
                icon={refreshing ? Loading03Icon : Refresh01Icon}
                strokeWidth={2}
                className={refreshing ? "animate-spin" : undefined}
              />
              Refresh
            </Button>
          }
        >
          Supplier balances{lowCount > 0 ? ` · ${lowCount} low` : ""}
        </SectionLabel>
        {supplierBalances === null ? (
          <StatGrid>
            {[0, 1, 2, 3].map((i) => (
              <StatCard key={i} label="Loading" value={dash} />
            ))}
          </StatGrid>
        ) : supplierBalances.length === 0 ? (
          <p className="subtext surface rounded-2xl px-4 py-8 text-center text-xs text-muted-foreground">
            No suppliers configured.
          </p>
        ) : (
          <StatGrid>
            {supplierBalances.map((s) => (
              <StatCard
                key={s.id}
                label={s.name}
                value={s.balance}
                tone={s.low ? "danger" : undefined}
                hint={s.low ? "Running low — top up soon" : s.status === "active" ? "Healthy" : s.status}
              />
            ))}
          </StatGrid>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-2 lg:col-span-4">
          <SectionLabel>Shortcuts</SectionLabel>
          <div className="surface rounded-2xl">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium transition-colors group-hover:text-primary">
                    {s.label}
                  </span>
                  <span className="subtext block text-[0.6875rem] text-muted-foreground">{s.hint}</span>
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:col-span-8">
          <SectionLabel>Admin access log</SectionLabel>
          {ipLog.length === 0 ? (
            <p className="subtext surface rounded-2xl px-4 py-8 text-center text-xs text-muted-foreground">
              No access entries yet.
            </p>
          ) : (
            <div className="surface rounded-2xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP address</TableHead>
                    <TableHead className="hidden md:table-cell">User agent</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipLog.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-[0.6875rem]">{entry.ip}</TableCell>
                      <TableCell className="hidden max-w-[320px] truncate text-muted-foreground md:table-cell">
                        {entry.userAgent}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
