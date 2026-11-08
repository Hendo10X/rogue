import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { proxiesOnSale } from "@/lib/proxies/settings";
import { parseProxySpec } from "@/lib/proxies/spec";
import { placeProxyOrder } from "@/lib/proxies/place-order";
import { toResponse } from "@/lib/order-result";

export const dynamic = "force-dynamic";

// POST { type, country, period, quantity, … } — orders proxies. The logic lives in
// lib/proxies/place-order.ts (shared with the Telegram bot).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isUserSuspended(session.user.id)) return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 403 });
  if (!(await proxiesOnSale())) return NextResponse.json({ error: "Proxies aren't available right now." }, { status: 503 });

  const spec = parseProxySpec(await req.json().catch(() => null));
  if (!spec) return NextResponse.json({ error: "Pick every option first." }, { status: 400 });
  return toResponse(await placeProxyOrder(session.user.id, spec));
}
