import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { proxyOrder } from "@/db/schema";
import { fetchOrderProxies } from "./provider";

export type ProxyOrderRow = typeof proxyOrder.$inferSelect;

/**
 * A customer's proxy orders. Any still processing are checked with the
 * supplier first, so credentials appear as soon as they're issued.
 * Returns [] before migration 0010.
 */
export async function getProxyOrders(userId: string): Promise<ProxyOrderRow[]> {
  let rows: ProxyOrderRow[];
  try {
    rows = await db.select().from(proxyOrder).where(eq(proxyOrder.userId, userId)).orderBy(desc(proxyOrder.createdAt)).limit(100);
  } catch {
    return [];
  }
  await Promise.all(
    rows
      .filter((o) => o.status === "processing" && o.providerOrderId)
      .map(async (o) => {
        try {
          const { proxies, expiresAt } = await fetchOrderProxies(o.providerOrderId!);
          if (proxies.length === 0) return;
          await db.update(proxyOrder).set({ status: "active", proxies, expiresAt, updatedAt: new Date() }).where(eq(proxyOrder.id, o.id));
          Object.assign(o, { status: "active", proxies, expiresAt });
        } catch (err) {
          console.error("[Proxies] refresh failed", o.id, err);
        }
      }),
  );
  return rows;
}

export function credentialLines(o: ProxyOrderRow): string[] {
  return (o.proxies ?? []).map((p) => `${p.ip}:${p.portHttp ?? p.portSocks ?? ""}:${p.login}:${p.password}`);
}

/** A proxy order in the shape the Orders page lists. */
export function toOrderListItem(o: ProxyOrderRow) {
  return {
    id: o.id,
    type: "proxy" as const,
    status: o.status === "active" ? "completed" : o.status,
    amount: o.amount,
    currency: "NGN",
    quantity: o.quantity,
    createdAt: o.createdAt,
    title: `${o.quantity} × IPv4 proxy · ${o.country} · ${o.period}`,
    platform: "Proxies",
    slug: "",
    supplierName: "Proxies",
    deliveryStatus: o.status === "active" ? "delivered" : "pending",
    credentials: credentialLines(o),
  };
}
