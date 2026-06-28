import { NextRequest, NextResponse } from "next/server";
import {
  authenticateApiRequest,
  getApiUserDiscountPercent,
  applyApiDiscount,
  ApiErrors,
} from "@/lib/api-auth";
import { getMarkupNaira } from "@/lib/admin-auth";
import { fetchServices } from "@/lib/boosting/socially";

export const dynamic = "force-dynamic";

// GET /api/v1/services — list boosting services with API-user pricing.
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q")?.toLowerCase();

    const [services, markupNaira, discount] = await Promise.all([
      fetchServices(),
      getMarkupNaira("boosting"),
      getApiUserDiscountPercent(),
    ]);

    let items = services.map((s) => {
      const normalRate = (parseFloat(s.rate) || 0) + markupNaira; // NGN per 1000
      const apiRate = applyApiDiscount(normalRate, discount);
      return {
        service: s.service,
        name: s.name,
        type: s.type,
        category: s.category,
        min: s.min,
        max: s.max,
        refill: s.refill,
        cancel: s.cancel,
        currency: "NGN",
        rate_per_1000: Number(apiRate.toFixed(2)),
        list_rate_per_1000: Number(normalRate.toFixed(2)),
        discount_percent: discount,
      };
    });

    if (category && category !== "all") {
      items = items.filter((s) => s.category === category);
    }
    if (query) {
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query),
      );
    }

    return NextResponse.json({ data: items, count: items.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch services";
    return ApiErrors.server(msg);
  }
}
