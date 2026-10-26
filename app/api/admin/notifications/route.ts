import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { logRequest } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-route";

export const dynamic = "force-dynamic";

// GET — counts behind the red dots in the admin nav. "Open" = not yet answered.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ openRequests: 0 });
  try {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(logRequest)
      .where(eq(logRequest.status, "open"));
    return NextResponse.json({ openRequests: n });
  } catch {
    return NextResponse.json({ openRequests: 0 });
  }
}
