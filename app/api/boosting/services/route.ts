import { NextRequest, NextResponse } from "next/server";
import { getMarkupNaira } from "@/lib/admin-auth";
import { fetchServices } from "@/lib/boosting/socially";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q")?.toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = (page - 1) * limit;

    const [services, markupNaira] = await Promise.all([
      fetchServices().catch(() => []),
      getMarkupNaira("boosting"),
    ]);

    const categories = Array.from(new Set(services.map((s) => s.category))).sort();

    let filteredServices = services.map((s) => {
      // socially.ng returns rates already in NGN — no USD conversion needed
      const rateNgnPer1000 = (parseFloat(s.rate) || 0) + markupNaira;
      return {
        ...s,
        provider: "socially",
        rate: rateNgnPer1000.toFixed(2),
        currency: "NGN",
        _sortRate: rateNgnPer1000,
      };
    });

    if (category && category !== "all") {
      filteredServices = filteredServices.filter((s) => s.category === category);
    }
    if (query) {
      filteredServices = filteredServices.filter((s) =>
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
      );
    }

    filteredServices.sort((a, b) => {
      if (a._sortRate === b._sortRate) return a.name.localeCompare(b.name);
      return a._sortRate - b._sortRate;
    });

    const items = filteredServices.map(({ _sortRate, ...rest }) => rest);
    const paged = items.slice(offset, offset + limit);
    const total = items.length;

    return NextResponse.json({
      items: paged,
      categories,
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
