import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteAdminSession } from "@/lib/admin-auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (token) {
    await deleteAdminSession(token);
  }
  cookieStore.delete("admin_session");
  return NextResponse.json({ ok: true });
}
