import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { manualListingIdsInCategory, removeInactiveManualListings } from "@/lib/manual-listing-removal";

export const dynamic = "force-dynamic";

// DELETE ?name=Category — permanently removes an inactive manual category.
// Refused while any of its logs is still active.
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "Missing category name" }, { status: 400 });

  const ids = await manualListingIdsInCategory(name);
  if (ids.length === 0) return NextResponse.json({ error: "No manual logs in that category" }, { status: 404 });
  const result = await removeInactiveManualListings(ids);
  if (result.skippedActive > 0) {
    return NextResponse.json(
      { error: `${result.skippedActive} log(s) in "${name}" are still active. Deactivate them first.`, ...result },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, ...result });
}
