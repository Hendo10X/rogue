import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies, headers } from "next/headers";
import { verifyAdminSession, getSetting, setSetting } from "@/lib/admin-auth";

const MAX_ENTRIES = 200;

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export interface IpLogEntry {
  ip: string;
  userAgent: string;
  timestamp: string;
  adminId: string;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await getSetting("admin_ip_log");
  const entries: IpLogEntry[] = raw ? JSON.parse(raw) : [];
  return NextResponse.json(entries.slice().reverse()); // newest first
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqHeaders = await headers();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = reqHeaders.get("user-agent") || "unknown";

  const entry: IpLogEntry = {
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
    adminId: admin.id,
  };

  const raw = await getSetting("admin_ip_log");
  const entries: IpLogEntry[] = raw ? JSON.parse(raw) : [];
  entries.push(entry);

  // Keep only the last MAX_ENTRIES
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  await setSetting("admin_ip_log", JSON.stringify(entries));
  return NextResponse.json({ ok: true });
}
