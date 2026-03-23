"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

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

function fmt(n: string) {
  return `₦${parseFloat(n).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ipLog, setIpLog] = useState<IpEntry[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch((e) => console.error("Failed to fetch stats", e));

    fetch("/api/admin/ip-log")
      .then((r) => r.json())
      .then((d) => setIpLog(Array.isArray(d) ? d.slice(0, 20) : []))
      .catch(() => {});
  }, []);

  const loading = stats === null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Admin Overview</h1>

      {/* ── Stats grid ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* Users */}
        <div className="rounded-lg border border-border bg-background p-4 shadow-none">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold mt-1">{loading ? "…" : stats.userCount}</p>
          <p className="text-muted-foreground text-xs mt-1">
            +{loading ? "…" : stats.newUsersWeek} this week · +{loading ? "…" : stats.newUsersMonth} this month
          </p>
        </div>

        {/* Revenue Week */}
        <div className="rounded-lg border border-border bg-background p-4 shadow-none">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Revenue (7 days)</p>
          <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
            {loading ? "…" : fmt(stats.revenueWeek)}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {loading ? "…" : stats.ordersWeek} orders
          </p>
        </div>

        {/* Revenue Month */}
        <div className="rounded-lg border border-border bg-background p-4 shadow-none">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Revenue (30 days)</p>
          <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
            {loading ? "…" : fmt(stats.revenueMonth)}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {loading ? "…" : stats.ordersMonth} orders
          </p>
        </div>

        {/* Revenue All-Time */}
        <div className="rounded-lg border border-border bg-background p-4 shadow-none">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">
            {loading ? "…" : fmt(stats.revenueTotal)}
          </p>
          <p className="text-muted-foreground text-xs mt-1">all-time deposits</p>
        </div>
      </div>

      {/* ── Nav cards ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Link
          href="/ozymandias/orders"
          className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Orders</h2>
          <p className="text-muted-foreground text-sm">View marketplace and boosting orders</p>
        </Link>
        <Link
          href="/ozymandias/suppliers"
          className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Suppliers</h2>
          <p className="text-muted-foreground text-sm">Monitor supplier balances and status</p>
        </Link>
        <Link
          href="/ozymandias/settings"
          className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Settings</h2>
          <p className="text-muted-foreground text-sm">Adjust markup, currency, and security</p>
        </Link>
      </div>

      {/* ── IP Access Log ──────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Admin Access Log</h2>
        {ipLog.length === 0 ? (
          <p className="text-muted-foreground text-sm">No access entries yet.</p>
        ) : (
          <div className="rounded-lg border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">IP Address</th>
                  <th className="text-left px-4 py-2 font-medium hidden md:table-cell">User Agent</th>
                  <th className="text-left px-4 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {ipLog.map((entry, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{entry.ip}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs hidden md:table-cell truncate max-w-[300px]">
                      {entry.userAgent}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
