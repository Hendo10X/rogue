import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { getFeaturedIds, MAX_FEATURED, setFeaturedIds } from "@/lib/featured";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ids: await getFeaturedIds(), max: MAX_FEATURED });
}

// PUT { ids: string[] } — replaces the featured list (first 3 kept).
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  if (!Array.isArray(body?.ids)) return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
  const ids = (body.ids as unknown[]).filter((x): x is string => typeof x === "string");
  if (ids.length > MAX_FEATURED) {
    return NextResponse.json({ error: `You can feature up to ${MAX_FEATURED} logs.` }, { status: 400 });
  }
  return NextResponse.json({ ids: await setFeaturedIds(ids) });
}
