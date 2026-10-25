import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { MAX_PROXIES_PER_ORDER, priceNgn, proxiesOnSale } from "@/lib/proxies/settings";
import { quoteUsd } from "@/lib/proxies/provider";

export const dynamic = "force-dynamic";

// POST { country, period, quantity } — the ₦ price for that order.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await proxiesOnSale())) return NextResponse.json({ error: "Proxies aren't available right now." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { country?: unknown; period?: unknown; quantity?: unknown } | null;
  const quantity = Number(body?.quantity);
  if (typeof body?.country !== "string" || typeof body?.period !== "string" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PROXIES_PER_ORDER) {
    return NextResponse.json({ error: "Pick a country, a period and a quantity." }, { status: 400 });
  }
  try {
    const usd = await quoteUsd(body.country, body.period, quantity);
    return NextResponse.json({ priceNgn: await priceNgn(usd) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't get a price" }, { status: 502 });
  }
}
