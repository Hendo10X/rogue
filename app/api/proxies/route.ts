import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getCatalog, MAX_PROXIES_PER_ORDER, proxiesOnSale } from "@/lib/proxies/settings";
import { getProxyOrders } from "@/lib/proxies/orders";

export const dynamic = "force-dynamic";

// GET — what's on sale plus the customer's orders (processing ones re-checked).
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

  const orders = await getProxyOrders(session.user.id);

  return NextResponse.json({ onSale, ...catalog, maxQuantity: MAX_PROXIES_PER_ORDER, orders });
}
