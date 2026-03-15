import { NextRequest, NextResponse } from "next/server";
import { getMarkupNaira } from "@/lib/admin-auth";
import { fetchServices as fetchRSS } from "@/lib/boosting/really-simple-social";
import { fetchServices as fetchRP } from "@/lib/boosting/reseller-provider";
import { getUSDtoNGNRate } from "@/lib/currency";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q")?.toLowerCase();
    const minPrice = parseFloat(searchParams.get("minPrice") ?? "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") ?? "Infinity");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = (page - 1) * limit;

    const [rssServices, rpServices, markupNaira, rate] = await Promise.all([
      fetchRSS().catch(() => []),
      fetchRP().catch(() => []),
      getMarkupNaira("boosting"),
      getUSDtoNGNRate(),
    ]);

    // Tag and merge services
    const services = [
      ...rssServices.map(s => ({ ...s, provider: "rss" })),
      ...rpServices.map(s => ({ ...s, provider: "rp" })),
    ];

    // Extract unique categories
    const categories = Array.from(new Set(services.map((s) => s.category))).sort();

    // Filter services
    // API `rate` = price for 1000 quantity (USD). Convert to NGN and add markup.
    // We return rate = NGN price for 1000 units. User total = rate × (quantity / 1000).
    let filteredServices = services.map((s) => {
      const supplierRateUsdPer1000 = parseFloat(s.rate) || 0;
      const rateNgnPer1000 = supplierRateUsdPer1000 * rate + markupNaira;
      return {
        ...s,
        rateNgn: rateNgnPer1000,
        rate: rateNgnPer1000.toFixed(2),
        currency: "NGN",
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
    
    // Price filtering
    filteredServices = filteredServices.filter(
      (s) => s.rateNgn >= minPrice && s.rateNgn <= maxPrice,
    );

    // Sort by cheapest first so lower priced services show before expensive ones
    filteredServices.sort((a, b) => {
      const ap = typeof a.rateNgn === "number" ? a.rateNgn : 0;
      const bp = typeof b.rateNgn === "number" ? b.rateNgn : 0;
      if (ap === bp) {
        return a.name.localeCompare(b.name);
      }
      return ap - bp;
    });

    const items = filteredServices.slice(offset, offset + limit);
    const total = filteredServices.length;

    return NextResponse.json({
      items,
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
