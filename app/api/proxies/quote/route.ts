import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { priceNgn, proxiesOnSale } from "@/lib/proxies/settings";
import { parseProxySpec } from "@/lib/proxies/spec";
import { quoteUsd } from "@/lib/proxies/provider";

export const dynamic = "force-dynamic";

// POST { type, country, period, quantity, operator?, rotation?, protocol? } — the ₦ price.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await proxiesOnSale())) return NextResponse.json({ error: "Proxies aren't available right now." }, { status: 503 });

  const spec = parseProxySpec(await req.json().catch(() => null));
  if (!spec) return NextResponse.json({ error: "Pick every option first." }, { status: 400 });
  try {
    const usd = await quoteUsd(spec);
    return NextResponse.json({ priceNgn: await priceNgn(usd) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't get a price" }, { status: 502 });
  }
}
