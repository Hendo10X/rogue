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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface SiteRow {
  keyId: string;
  name: string;
  prefix: string;
  active: boolean;
  ownerEmail: string | null;
  logsCount: number;
  logsRevenue: number;
  boostingCount: number;
  boostingRevenue: number;
  totalCount: number;
  totalRevenue: number;
  markups: string[];
  lastPurchaseAt: string | null;
}

interface Analytics {
  currentApiMarkupPercent: number;
  totals: {
    logs: { count: number; revenue: number };
    boosting: { count: number; revenue: number };
  };
  sites: SiteRow[];
  unattributed: { logs: number; boosting: number };
}

const ngn = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 2 });

export default function ApiAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/api-analytics")
      .then((r) => r.json())
      .then((d) => setData(d && !d.error ? d : null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">API Analytics</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Spinner className="size-4" /> Loading…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">API Analytics</h1>
        <p className="text-muted-foreground">Failed to load analytics.</p>
      </div>
    );
  }

  const unattrTotal = data.unattributed.logs + data.unattributed.boosting;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">API Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Purchases made through the public Rogue API, broken down by type and by
          the reseller site (API key) that placed them.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <p className="text-muted-foreground text-sm">Logs purchased via API</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.totals.logs.count}</p>
            <p className="text-muted-foreground text-sm">
              {ngn(data.totals.logs.revenue)} revenue
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <p className="text-muted-foreground text-sm">
              Boosting purchased via API
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.totals.boosting.count}</p>
            <p className="text-muted-foreground text-sm">
              {ngn(data.totals.boosting.revenue)} revenue
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <p className="text-muted-foreground text-sm">
              Current API reseller markup
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {data.currentApiMarkupPercent}%
            </p>
            <p className="text-muted-foreground text-sm">
              Applied live to every new API order
            </p>
          </CardContent>
        </Card>
      </div>

      {unattrTotal > 0 && (
        <p className="text-muted-foreground text-xs">
          Note: {unattrTotal} older API order{unattrTotal === 1 ? "" : "s"} (
          {data.unattributed.logs} logs, {data.unattributed.boosting} boosting)
          were placed before per-site tracking was added and can&apos;t be
          attributed to a specific key.
        </p>
      )}

      {/* Per-site table */}
      <div className="space-y-2">
        <h2 className="font-medium">By site (API key)</h2>

        <div className="hidden md:block rounded-lg border bg-background shadow-none">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead>Site / Key</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Logs</TableHead>
                <TableHead className="text-right">Boosting</TableHead>
                <TableHead className="text-right">Total revenue</TableHead>
                <TableHead>Markup charged</TableHead>
                <TableHead>Last purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sites.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No API purchases yet
                  </TableCell>
                </TableRow>
              ) : (
                data.sites.map((s) => (
                  <TableRow key={s.keyId} className="border-b">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        {!s.active && (
                          <Badge
                            variant="secondary"
                            className="bg-red-500/15 text-red-600 dark:text-red-400"
                          >
                            disabled
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground font-mono text-xs">
                        {s.prefix}…
                      </span>
                    </TableCell>
                    <TableCell>{s.ownerEmail ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {s.logsCount}
                      <span className="text-muted-foreground block text-xs">
                        {ngn(s.logsRevenue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.boostingCount}
                      <span className="text-muted-foreground block text-xs">
                        {ngn(s.boostingRevenue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {ngn(s.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s.markups.length ? s.markups.map((m) => `${m}%`).join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s.lastPurchaseAt
                        ? new Date(s.lastPurchaseAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {data.sites.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border bg-card p-6 text-center">
              No API purchases yet
            </div>
          ) : (
            data.sites.map((s) => (
              <div key={s.keyId} className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {s.name}
                      {!s.active && (
                        <Badge
                          variant="secondary"
                          className="bg-red-500/15 text-red-600 dark:text-red-400"
                        >
                          disabled
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {s.ownerEmail ?? "—"}
                    </p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {s.prefix}…
                    </p>
                  </div>
                  <span className="font-medium">{ngn(s.totalRevenue)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Logs</p>
                    <p>
                      {s.logsCount}{" "}
                      <span className="text-muted-foreground text-xs">
                        ({ngn(s.logsRevenue)})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Boosting</p>
                    <p>
                      {s.boostingCount}{" "}
                      <span className="text-muted-foreground text-xs">
                        ({ngn(s.boostingRevenue)})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Markup charged</p>
                    <p>{s.markups.length ? s.markups.map((m) => `${m}%`).join(", ") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last purchase</p>
                    <p className="text-xs">
                      {s.lastPurchaseAt
                        ? new Date(s.lastPurchaseAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
