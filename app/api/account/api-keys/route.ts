import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { apiKey } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateApiKey } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

// GET — list the signed-in user's API keys (never returns the secret).
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      active: apiKey.active,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
    })
    .from(apiKey)
    .where(eq(apiKey.userId, user.id))
    .orderBy(desc(apiKey.createdAt));

  return NextResponse.json({ keys: rows });
}

// POST — create a new key. The full secret is returned exactly once.
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* name optional */
  }
  const name = (body.name?.trim() || "API key").slice(0, 60);

  const { key, hash, prefix } = generateApiKey();
  const id = crypto.randomUUID();
  await db.insert(apiKey).values({
    id,
    userId: user.id,
    name,
    keyHash: hash,
    keyPrefix: prefix,
  });

  return NextResponse.json({
    id,
    name,
    // Shown once — the user must copy it now.
    key,
    keyPrefix: prefix,
  });
}
