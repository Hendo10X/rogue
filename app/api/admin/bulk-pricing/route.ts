import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { getBulkPricing, setBulkPricing } from "@/lib/bulk-pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getBulkPricing());
}

// PUT { enabled, minQty, amountOff } — amountOff is ₦ off each piece.
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { enabled?: unknown; minQty?: unknown; amountOff?: unknown } | null;
  const minQty = Math.round(Number(body?.minQty));
  const amountOff = Math.round(Number(body?.amountOff));
  if (!Number.isFinite(minQty) || minQty < 2 || minQty > 100_000) {
    return NextResponse.json({ error: "Bulk must start at 2 pieces or more." }, { status: 400 });
  }
  if (!Number.isFinite(amountOff) || amountOff < 1 || amountOff > 1_000_000) {
    return NextResponse.json({ error: "The discount must be at least ₦1 per piece." }, { status: 400 });
  }
  const next = { enabled: body?.enabled === true, minQty, amountOff };
  await setBulkPricing(next);
  return NextResponse.json(next);
}
