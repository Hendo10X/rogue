import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { getBulkPricing, setBulkPricing } from "@/lib/bulk-pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getBulkPricing());
}

// PUT { enabled, minQty, percent }
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { enabled?: unknown; minQty?: unknown; percent?: unknown } | null;
  const minQty = Math.round(Number(body?.minQty));
  const percent = Number(body?.percent);
  if (!Number.isFinite(minQty) || minQty < 2 || minQty > 100_000) {
    return NextResponse.json({ error: "Bulk must start at 2 pieces or more." }, { status: 400 });
  }
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 90) {
    return NextResponse.json({ error: "The discount must be between 0% and 90%." }, { status: 400 });
  }
  const next = { enabled: body?.enabled === true, minQty, percent: Math.round(percent * 100) / 100 };
  await setBulkPricing(next);
  return NextResponse.json(next);
}
