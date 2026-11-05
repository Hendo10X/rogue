import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-route";
import { setSetting } from "@/lib/admin-auth";
import { getMarketplacePricing } from "@/lib/pricing";
import { fetchAccszoneBalance } from "@/lib/suppliers/accszone";

export const dynamic = "force-dynamic";

async function accszoneSupplier() {
  const [row] = await db.select().from(supplier).where(eq(supplier.slug, "accszone")).limit(1);
  return row ?? null;
}

// GET — AccsZone's own profit, whether it's connected, and its balance (USD).
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [pricing, sup] = await Promise.all([getMarketplacePricing(), accszoneSupplier()]);
  const key = sup?.apiKey || process.env.ACCSZONE_API_KEY?.trim() || "";
  return NextResponse.json({
    configured: !!key,
    connected: !!sup,
    active: sup?.status === "active",
    balanceUsd: key ? await fetchAccszoneBalance(key) : null,
    profit: pricing.accszone,
  });
}

// PUT { flatFeeNaira, thresholdNaira, percent } — AccsZone's profit rule.
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const fields = [
    ["flatFeeNaira", "az_flat_fee_naira"],
    ["thresholdNaira", "az_threshold_naira"],
    ["percent", "az_percent"],
  ] as const;
  for (const [field] of fields) {
    const n = Number(body?.[field]);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: `${field} must be a number ≥ 0` }, { status: 400 });
  }
  for (const [field, key] of fields) await setSetting(key, String(Math.round(Number(body![field]) * 100) / 100));
  return NextResponse.json({ ok: true, profit: (await getMarketplacePricing()).accszone });
}
