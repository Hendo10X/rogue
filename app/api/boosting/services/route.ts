import { NextRequest, NextResponse } from "next/server";
import { getMarkupPercent } from "@/lib/admin-auth";
import { fetchServices } from "@/lib/boosting/really-simple-social";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
    const offset = (page - 1) * limit;

    const [services, markupPercent] = await Promise.all([
      fetchServices(),
      getMarkupPercent("boosting"),
    ]);

    const multiplier = 1 + markupPercent / 100;
    const items = services
      .map((s) => ({
        ...s,
        rate: (parseFloat(s.rate) * multiplier).toFixed(2),
      }))
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
