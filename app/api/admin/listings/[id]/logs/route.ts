import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { listing } from "@/db/schema";
import { verifyAdminSession } from "@/lib/admin-auth";
import {
  addManualLogItems,
  clearUnsoldManualLogs,
  getManualLogCounts,
} from "@/lib/manual-logs";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

/** Only manual listings take uploaded logs. */
async function getManualListing(id: string) {
  const [row] = await db
    .select({ id: listing.id })
    .from(listing)
    .where(and(eq(listing.id, id), sql`${listing.metadata} ->> 'manual' = 'true'`))
    .limit(1);
  return row ?? null;
}

const SETUP_ERROR = "Log uploads aren't set up yet. Apply migration 0007_admin_emails_and_manual_logs.sql.";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const counts = (await getManualLogCounts([id])).get(id) ?? { available: 0, sold: 0 };
    return NextResponse.json(counts);
  } catch {
    return NextResponse.json({ error: SETUP_ERROR }, { status: 500 });
  }
}

/** Body: { text: "line1\nline2…" } — one log per line. */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await getManualListing(id))) {
    return NextResponse.json({ error: "Manual listing not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Paste or upload at least one log." }, { status: 400 });
  }

  try {
    const result = await addManualLogItems(id, body.text);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("Upload at most")) return NextResponse.json({ error: msg }, { status: 400 });
    console.error("[Manual logs] upload failed", err);
    return NextResponse.json({ error: SETUP_ERROR }, { status: 500 });
  }
}

/** Remove all unsold logs from the listing. */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await getManualListing(id))) {
    return NextResponse.json({ error: "Manual listing not found" }, { status: 404 });
  }
  try {
    const removed = await clearUnsoldManualLogs(id);
    return NextResponse.json({ removed });
  } catch {
    return NextResponse.json({ error: SETUP_ERROR }, { status: 500 });
  }
}
