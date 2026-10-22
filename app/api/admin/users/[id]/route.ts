import { NextRequest, NextResponse } from "next/server";
import { setUserSuspended } from "@/lib/suspension";
import { isAdminEmail } from "@/lib/admin-emails";
import { cookies } from "next/headers";
import { verifyAdminSession, getSetting } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await verifyAdminSession(token);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // PIN verification
  let pin: string | undefined;
  try {
    const body = await request.json();
    pin = body?.pin;
  } catch { /* body may be empty */ }

  const storedPin = await getSetting("action_pin");
  if (storedPin) {
    if (!pin || pin !== storedPin) {
      return NextResponse.json({ error: "Incorrect security PIN" }, { status: 403 });
    }
  }

  const { id } = await params;

  try {
    // Session and Account cascades are handled by DB-level "onDelete: cascade"
    await db.delete(user).where(eq(user.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

/** Suspend or unsuspend an account. Body: { suspended: boolean, reason?: string } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = (await cookies()).get("admin_session")?.value;
  const admin = token ? await verifyAdminSession(token) : null;
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { suspended?: unknown; reason?: unknown };
  if (typeof body.suspended !== "boolean") {
    return NextResponse.json({ error: "suspended must be true or false" }, { status: 400 });
  }

  const [target] = await db.select({ id: user.id, email: user.email }).from(user).where(eq(user.id, id)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (body.suspended && (await isAdminEmail(target.email))) {
    return NextResponse.json({ error: "Admins can't be suspended. Remove their admin access first." }, { status: 400 });
  }

  try {
    await setUserSuspended(id, body.suspended, admin.username, typeof body.reason === "string" ? body.reason : null);
    return NextResponse.json({ ok: true, suspended: body.suspended });
  } catch {
    return NextResponse.json(
      { error: "Suspensions aren't set up yet. Apply migration 0008_user_suspension.sql." },
      { status: 500 }
    );
  }
}
