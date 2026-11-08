import { NextResponse } from "next/server";
import { getBulkPricing } from "@/lib/bulk-pricing";

export const dynamic = "force-dynamic";

// GET — the bulk discount rule, so listings can show the bulk price.
export async function GET() {
  return NextResponse.json(await getBulkPricing(), {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
