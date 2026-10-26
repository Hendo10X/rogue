import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getCatalog, MAX_PROXIES_PER_ORDER, proxiesOnSale } from "@/lib/proxies/settings";
import { getProxyOrders } from "@/lib/proxies/orders";
import { PROXY_TYPES, type ProxyCatalog, type ProxyType } from "@/lib/proxies/provider";

export const dynamic = "force-dynamic";

// GET — what's on sale plus the customer's orders (processing ones re-checked).
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const onSale = await proxiesOnSale();
  const catalogs: Partial<Record<ProxyType, ProxyCatalog>> = {};
  if (onSale) {
    await Promise.all(
      PROXY_TYPES.map(async (type) => {
        try {
          catalogs[type] = await getCatalog(type);
        } catch (err) {
          console.error("[Proxies] catalog failed", type, err);
        }
      }),
    );
  }

  const orders = await getProxyOrders(session.user.id);

  return NextResponse.json({ onSale, catalogs, maxQuantity: MAX_PROXIES_PER_ORDER, orders });
}
