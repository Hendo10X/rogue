import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import {
  addAdminEmail,
  isOwnerEmail,
  listAddedAdmins,
  removeAdminEmail,
} from "@/lib/admin-emails";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

async function readEmail(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  return body.email?.trim().toLowerCase() ?? "";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ admins: await listAddedAdmins() });
  } catch {
    return NextResponse.json(
      { error: "Admin list isn't set up yet. Apply migration 0007_admin_emails_and_manual_logs.sql." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = await readEmail(req);
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (isOwnerEmail(email)) {
    return NextResponse.json({ error: "That email is already an owner." }, { status: 409 });
  }

  try {
    await addAdminEmail(email, admin.username);
    return NextResponse.json({ ok: true, email });
  } catch {
    return NextResponse.json({ error: "Could not add admin." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = await readEmail(req);
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });
  if (isOwnerEmail(email)) {
    return NextResponse.json({ error: "Owner accounts can't be removed." }, { status: 400 });
  }
  if (email === admin.username.toLowerCase()) {
    return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
  }

  try {
    await removeAdminEmail(email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove admin." }, { status: 500 });
  }
}
