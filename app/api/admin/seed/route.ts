import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/db/drizzle";
import { admin } from "@/db/schema";
import { createOrUpdateAdmin } from "@/lib/admin-auth";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin123";

export async function POST(req: NextRequest) {
  const [existing] = await db.select().from(admin).limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "Admin already exists. Use change-password to update." },
      { status: 403 },
    );
  }

  const seedSecret = process.env.ADMIN_SEED_SECRET?.trim();
  if (seedSecret) {
    let body: { secret?: string } = {};
    try {
      body = (await req.json()) as { secret?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid request. Provide { secret } when ADMIN_SEED_SECRET is set." },
        { status: 400 },
      );
    }
    if (body.secret !== seedSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }
  }

  await createOrUpdateAdmin(DEFAULT_USERNAME, DEFAULT_PASSWORD);
  return NextResponse.json({ ok: true, username: DEFAULT_USERNAME });
}
