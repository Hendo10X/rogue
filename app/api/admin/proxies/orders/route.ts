import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { proxyOrder, user } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-route";
import { fetchOrderProxies, fetchOrderRaw } from "@/lib/proxies/provider";

export const dynamic = "force-dynamic";

// GET — recent proxy orders across all customers.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const orders = await db
      .select({
        id: proxyOrder.id,
        providerOrderId: proxyOrder.providerOrderId,
        country: proxyOrder.country,
        period: proxyOrder.period,
        quantity: proxyOrder.quantity,
        amount: proxyOrder.amount,
        status: proxyOrder.status,
        createdAt: proxyOrder.createdAt,
        userEmail: user.email,
      })
      .from(proxyOrder)
      .innerJoin(user, eq(proxyOrder.userId, user.id))
      .orderBy(desc(proxyOrder.createdAt))
      .limit(30);
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ orders: [], error: "Apply migration 0010_proxy_orders.sql first." });
  }
}

// POST { id } — ask proxy-seller about one order now: saves the credentials if
// they're ready and returns the supplier's raw answer so a stuck order can be read.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const [row] = await db.select().from(proxyOrder).where(eq(proxyOrder.id, body.id)).limit(1);
  if (!row?.providerOrderId) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  try {
    const [raw, parsed] = await Promise.all([fetchOrderRaw(row.providerOrderId), fetchOrderProxies(row.providerOrderId)]);
    if (parsed.proxies.length > 0 && row.status !== "active") {
      await db
        .update(proxyOrder)
        .set({ status: "active", proxies: parsed.proxies, expiresAt: parsed.expiresAt, updatedAt: new Date() })
        .where(eq(proxyOrder.id, row.id));
    }
    return NextResponse.json({ found: parsed.proxies.length, raw });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Supplier check failed" }, { status: 502 });
  }
}
