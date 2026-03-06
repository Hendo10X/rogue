import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  verifyAdminSession,
  changeAdminPassword,
} from "@/lib/admin-auth";

const schema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Password must be alphanumeric only"),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = await verifyAdminSession(token);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await changeAdminPassword(admin.id, parsed.data.newPassword);
  return NextResponse.json({ ok: true });
}
