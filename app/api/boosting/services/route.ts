import { NextRequest, NextResponse } from "next/server";
import { getMarkupNaira } from "@/lib/admin-auth";
import { fetchServices } from "@/lib/boosting/really-simple-social";
import { getUSDtoNGNRate } from "@/lib/currency";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
    const offset = (page - 1) * limit;

    const [services, markupNaira, rate] = await Promise.all([
      fetchServices(),
      getMarkupNaira("boosting"),
      getUSDtoNGNRate(),
    ]);

    const items = services
      .map((s) => {
        const supplierRateUsd = parseFloat(s.rate);
        const supplierRateNgn = supplierRateUsd * rate;
        const finalRateNgn = supplierRateNgn + markupNaira;
        return {
          ...s,
          rate: finalRateNgn.toFixed(2),
          currency: "NGN",
        };
      })
      .slice(offset, offset + limit);
    const total = services.length;

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch services";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
