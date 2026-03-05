import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { admin } from "@/db/schema";
import { createOrUpdateAdmin } from "@/lib/admin-auth";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin123";

export async function POST() {
  const [existing] = await db.select().from(admin).limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "Admin already exists. Use change-password to update." },
      { status: 403 },
    );
  }

  await createOrUpdateAdmin(DEFAULT_USERNAME, DEFAULT_PASSWORD);
  return NextResponse.json({ ok: true, username: DEFAULT_USERNAME });
}
