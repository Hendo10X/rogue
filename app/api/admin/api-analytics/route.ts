import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { order, boostingOrder, apiKey, user } from "@/db/schema";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getApiMarkupPercent } from "@/lib/api-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

// Failed orders were refunded, so they don't count as revenue.
const REVENUE_STATUSES = new Set(["completed", "processing", "pending"]);

interface KeyAgg {
  keyId: string;
  name: string;
  prefix: string;
  active: boolean;
  ownerEmail: string | null;
  logsCount: number;
  logsRevenue: number;
  boostingCount: number;
  boostingRevenue: number;
  markups: Set<string>;
  lastPurchaseAt: string | null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [logRows, boostingRows, currentMarkup] = await Promise.all([
    db
      .select({
        id: order.id,
        amount: order.amount,
        status: order.status,
        markup: order.appliedMarkupPercent,
        createdAt: order.createdAt,
        keyId: apiKey.id,
        keyName: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        keyActive: apiKey.active,
        ownerEmail: user.email,
      })
      .from(order)
      .innerJoin(apiKey, eq(order.apiKeyId, apiKey.id))
      .leftJoin(user, eq(apiKey.userId, user.id))
      .where(isNotNull(order.apiKeyId)),
    db
      .select({
        id: boostingOrder.id,
        amount: boostingOrder.amount,
        status: boostingOrder.status,
        markup: boostingOrder.appliedMarkupPercent,
        createdAt: boostingOrder.createdAt,
        keyId: apiKey.id,
        keyName: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        keyActive: apiKey.active,
        ownerEmail: user.email,
      })
      .from(boostingOrder)
      .innerJoin(apiKey, eq(boostingOrder.apiKeyId, apiKey.id))
      .leftJoin(user, eq(apiKey.userId, user.id))
      .where(isNotNull(boostingOrder.apiKeyId)),
    getApiMarkupPercent(),
  ]);

  // API orders placed before key-attribution tracking existed. Surfaced so the
  // totals don't look like they're silently missing purchases.
  const [logUnattr, boostUnattr] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(order)
      .where(
        and(
          isNull(order.apiKeyId),
          sql`(${order.metadata} ->> 'via') = 'api'`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(boostingOrder)
      .where(and(isNull(boostingOrder.apiKeyId), eq(boostingOrder.provider, "api"))),
  ]);

  const totals = {
    logs: { count: 0, revenue: 0 },
    boosting: { count: 0, revenue: 0 },
  };
  const keys = new Map<string, KeyAgg>();

  function keyFor(row: {
    keyId: string;
    keyName: string;
    keyPrefix: string;
    keyActive: boolean;
    ownerEmail: string | null;
  }): KeyAgg {
    let agg = keys.get(row.keyId);
    if (!agg) {
      agg = {
        keyId: row.keyId,
        name: row.keyName,
        prefix: row.keyPrefix,
        active: row.keyActive,
        ownerEmail: row.ownerEmail,
        logsCount: 0,
        logsRevenue: 0,
        boostingCount: 0,
        boostingRevenue: 0,
        markups: new Set<string>(),
        lastPurchaseAt: null,
      };
      keys.set(row.keyId, agg);
    }
    return agg;
  }

  function noteTimeAndMarkup(
    agg: KeyAgg,
    createdAt: Date | string | null,
    markup: string | null,
  ) {
    if (markup != null) agg.markups.add(String(parseFloat(markup)));
    if (createdAt) {
      const iso = new Date(createdAt).toISOString();
      if (!agg.lastPurchaseAt || iso > agg.lastPurchaseAt) {
        agg.lastPurchaseAt = iso;
      }
    }
  }

  for (const r of logRows) {
    const agg = keyFor(r);
    const revenue = REVENUE_STATUSES.has(r.status) ? parseFloat(r.amount) || 0 : 0;
    agg.logsCount += 1;
    agg.logsRevenue += revenue;
    totals.logs.count += 1;
    totals.logs.revenue += revenue;
    noteTimeAndMarkup(agg, r.createdAt, r.markup);
  }
  for (const r of boostingRows) {
    const agg = keyFor(r);
    const revenue = REVENUE_STATUSES.has(r.status) ? parseFloat(r.amount) || 0 : 0;
    agg.boostingCount += 1;
    agg.boostingRevenue += revenue;
    totals.boosting.count += 1;
    totals.boosting.revenue += revenue;
    noteTimeAndMarkup(agg, r.createdAt, r.markup);
  }

  const sites = Array.from(keys.values())
    .map((k) => ({
      keyId: k.keyId,
      name: k.name,
      prefix: k.prefix,
      active: k.active,
      ownerEmail: k.ownerEmail,
      logsCount: k.logsCount,
      logsRevenue: Math.round(k.logsRevenue * 100) / 100,
      boostingCount: k.boostingCount,
      boostingRevenue: Math.round(k.boostingRevenue * 100) / 100,
      totalCount: k.logsCount + k.boostingCount,
      totalRevenue: Math.round((k.logsRevenue + k.boostingRevenue) * 100) / 100,
      markups: Array.from(k.markups).sort(),
      lastPurchaseAt: k.lastPurchaseAt,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return NextResponse.json({
    currentApiMarkupPercent: currentMarkup,
    totals: {
      logs: {
        count: totals.logs.count,
        revenue: Math.round(totals.logs.revenue * 100) / 100,
      },
      boosting: {
        count: totals.boosting.count,
        revenue: Math.round(totals.boosting.revenue * 100) / 100,
      },
    },
    sites,
    unattributed: {
      logs: logUnattr[0]?.count ?? 0,
      boosting: boostUnattr[0]?.count ?? 0,
    },
  });
}
