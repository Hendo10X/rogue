import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { proxyOrder } from "@/db/schema";
import { getCatalog, MAX_PROXIES_PER_ORDER, proxiesOnSale } from "@/lib/proxies/settings";
import { fetchOrderProxies } from "@/lib/proxies/provider";

export const dynamic = "force-dynamic";

// GET — what's on sale plus the customer's orders. Orders still processing
// are checked with the supplier so credentials appear as soon as they're ready.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const onSale = await proxiesOnSale();
  let catalog = { countries: [] as { id: string; name: string }[], periods: [] as { id: string; name: string }[] };
  if (onSale) {
    try {
      catalog = await getCatalog();
    } catch (err) {
      console.error("[Proxies] catalog failed", err);
    }
  }

  let orders: (typeof proxyOrder.$inferSelect)[] = [];
  try {
    orders = await db
      .select()
      .from(proxyOrder)
      .where(eq(proxyOrder.userId, session.user.id))
      .orderBy(desc(proxyOrder.createdAt))
      .limit(50);
  } catch {
    // Table not migrated yet: show the page without history.
  }

  for (const o of orders) {
    if (o.status !== "processing" || !o.providerOrderId) continue;
    try {
      const { proxies, expiresAt } = await fetchOrderProxies(o.providerOrderId);
      if (proxies.length > 0) {
        await db
          .update(proxyOrder)
          .set({ status: "active", proxies, expiresAt, updatedAt: new Date() })
          .where(eq(proxyOrder.id, o.id));
        Object.assign(o, { status: "active", proxies, expiresAt });
      }
    } catch (err) {
      console.error("[Proxies] refresh failed", o.id, err);
    }
  }

  return NextResponse.json({ onSale, ...catalog, maxQuantity: MAX_PROXIES_PER_ORDER, orders });
}
