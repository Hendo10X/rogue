import { NextResponse } from "next/server";
import { getPopularListings } from "@/lib/featured";

export const dynamic = "force-dynamic";

// GET /api/marketplace/popular — featured picks + best sellers for the top of the store.
export async function GET() {
  try {
    return NextResponse.json({ items: await getPopularListings() });
  } catch (err) {
    console.error("[Marketplace] popular failed", err);
    return NextResponse.json({ items: [] });
  }
}
