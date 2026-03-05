import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = await verifyAdminSession(token);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(admin);
}
