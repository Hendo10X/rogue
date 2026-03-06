import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  verifyAdminPassword,
  createAdminSession,
  createOrUpdateAdmin,
} from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { admin } from "@/db/schema";

const schema = z.object({
  username: z.string().min(1, "Username required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Password must be alphanumeric only"),
});

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin123";

export async function POST(req: NextRequest) {
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

  const { username, password } = parsed.data;

  // Auto-seed default admin if none exists
  const [existing] = await db.select().from(admin).limit(1);
  if (!existing && username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
    await createOrUpdateAdmin(DEFAULT_USERNAME, DEFAULT_PASSWORD);
  }

  const adminUser = await verifyAdminPassword(username, password);
  if (!adminUser) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const token = await createAdminSession(adminUser.id);
  const cookieStore = await cookies();
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({ ok: true, username: adminUser.username });
}
