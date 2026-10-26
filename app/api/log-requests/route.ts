import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { logRequest } from "@/db/schema";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/** Open requests one customer may have at a time, to keep the queue honest. */
const MAX_OPEN = 5;

const schema = z.object({
  platform: z.string().trim().min(2).max(60),
  details: z.string().trim().min(10).max(1000),
  quantity: z.coerce.number().int().min(1).max(10_000),
  budgetNgn: z.coerce.number().min(0).max(100_000_000).optional().nullable(),
});

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select({
      id: logRequest.id,
      platform: logRequest.platform,
      details: logRequest.details,
      quantity: logRequest.quantity,
      budgetNgn: logRequest.budgetNgn,
      status: logRequest.status,
      adminNote: logRequest.adminNote,
      createdAt: logRequest.createdAt,
    })
    .from(logRequest)
    .where(eq(logRequest.userId, user.id))
    .orderBy(desc(logRequest.createdAt))
    .limit(50);
  // Opening the page reads every reply, which clears the red dot. (Fails
  // quietly until migration 0011 adds the column.)
  await db
    .update(logRequest)
    .set({ customerUnread: false })
    .where(and(eq(logRequest.userId, user.id), eq(logRequest.customerUnread, true)))
    .catch(() => {});
  return NextResponse.json({ requests: rows });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isUserSuspended(user.id)) return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Add the platform and at least a sentence on what you need." }, { status: 400 });
  }

  const [{ open }] = await db
    .select({ open: sql<number>`count(*)::int` })
    .from(logRequest)
    .where(and(eq(logRequest.userId, user.id), inArray(logRequest.status, ["open", "sourcing"])));
  if (open >= MAX_OPEN) {
    return NextResponse.json(
      { error: `You already have ${MAX_OPEN} open requests. Wait for a reply on those first.` },
      { status: 429 },
    );
  }

  const { platform, details, quantity, budgetNgn } = parsed.data;
  const id = crypto.randomUUID();
  const budget = budgetNgn ? String(budgetNgn) : null;
  try {
    await db.insert(logRequest).values({ id, userId: user.id, platform, details, quantity, budgetNgn: budget });
  } catch {
    // Before migration 0011 the insert names a column that doesn't exist yet; write without it.
    await db.execute(sql`
      INSERT INTO "log_request" ("id", "user_id", "platform", "details", "quantity", "budget_ngn")
      VALUES (${id}, ${user.id}, ${platform}, ${details}, ${quantity}, ${budget})`);
  }
  void sendTelegramMessage(
    [
      "📝 <b>New log request</b>",
      `<b>From:</b> ${escapeHtml(user.email)}`,
      `<b>Platform:</b> ${escapeHtml(platform)} × ${quantity}${budgetNgn ? ` · up to ₦${budgetNgn}` : ""}`,
      escapeHtml(details),
      "Answer it on Ozymandias → Requests.",
    ].join("\n"),
  ).catch(() => {});
  return NextResponse.json({ ok: true, id });
}
