import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { tutorial } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-route";
import { listTutorials } from "@/lib/tutorials";

export const dynamic = "force-dynamic";

const fields = z.object({
  title: z.string().trim().min(2).max(140),
  topic: z.string().trim().min(1).max(60).default("General"),
  body: z.string().max(20_000).default(""),
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Video link must start with http(s)://")
    .optional()
    .nullable(),
  published: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

function bad(error: z.ZodError) {
  return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid tutorial" }, { status: 400 });
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ tutorials: await listTutorials({ includeDrafts: true }) });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = fields.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error);
  const id = crypto.randomUUID();
  try {
    await db.insert(tutorial).values({ id, ...parsed.data, videoUrl: parsed.data.videoUrl || null });
  } catch {
    return NextResponse.json(
      { error: "Tutorials aren't set up yet. Apply migration 0009_log_requests_and_tutorials.sql." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id });
}

// PATCH { id, ...fields } — partial update.
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = fields.partial().safeParse(body);
  if (!parsed.success) return bad(parsed.error);
  const data = { ...parsed.data, ...(parsed.data.videoUrl !== undefined ? { videoUrl: parsed.data.videoUrl || null } : {}) };
  await db.update(tutorial).set({ ...data, updatedAt: new Date() }).where(eq(tutorial.id, body.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(tutorial).where(eq(tutorial.id, id));
  return NextResponse.json({ ok: true });
}
