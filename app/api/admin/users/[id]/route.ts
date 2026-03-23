import { NextRequest, NextResponse } from "next/server";
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
