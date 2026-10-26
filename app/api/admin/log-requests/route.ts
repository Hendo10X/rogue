import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { logRequest, user } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-route";

export const dynamic = "force-dynamic";

const STATUSES = ["open", "sourcing", "fulfilled", "declined"] as const;

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await db
      .select({
        id: logRequest.id,
        platform: logRequest.platform,
        details: logRequest.details,
        quantity: logRequest.quantity,
        budgetNgn: logRequest.budgetNgn,
        status: logRequest.status,
        adminNote: logRequest.adminNote,
        createdAt: logRequest.createdAt,
        userEmail: user.email,
        userName: user.name,
      })
      .from(logRequest)
      .innerJoin(user, eq(logRequest.userId, user.id))
      .orderBy(desc(logRequest.createdAt))
      .limit(500);
    return NextResponse.json({ requests: rows });
  } catch (err) {
    console.error("[Admin log requests] list failed", err);
    return NextResponse.json(
      { error: "Log requests aren't set up yet. Apply migration 0009_log_requests_and_tutorials.sql." },
      { status: 500 },
    );
  }
}

// PATCH { id, status?, adminNote? } — the note is shown to the customer.
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown; adminNote?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Any answer lights the red dot on the customer's Tools menu.
  const updates: { status?: string; adminNote?: string | null; customerUnread: boolean; updatedAt: Date } = {
    customerUnread: true,
    updatedAt: new Date(),
  };
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    updates.status = body.status as string;
  }
  if (body.adminNote !== undefined) {
    updates.adminNote = typeof body.adminNote === "string" && body.adminNote.trim() ? body.adminNote.trim().slice(0, 1000) : null;
  }
  try {
    await db.update(logRequest).set(updates).where(eq(logRequest.id, body.id));
  } catch {
    // Before migration 0011 there is no unread column: save the answer without the dot.
    const { customerUnread, ...rest } = updates;
    void customerUnread;
    await db.update(logRequest).set(rest).where(eq(logRequest.id, body.id));
  }
  return NextResponse.json({ ok: true });
}
