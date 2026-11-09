import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { shopBotConfigured } from "@/lib/telegram-bot/api";
import {
  broadcastHistory,
  cancelBroadcast,
  currentBroadcast,
  memberCount,
  sendNextBatch,
  sendTest,
  startBroadcast,
  validButton,
} from "@/lib/telegram-bot/broadcast";
import { TEXT_LIMIT } from "@/lib/telegram-bot/settings";

export const dynamic = "force-dynamic";
// One batch is 25 messages (~1–2 seconds); leave room.
export const maxDuration = 60;

// GET — members, the announcement being sent (if any) and recent ones.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [members, current, history] = await Promise.all([memberCount().catch(() => 0), currentBroadcast(), broadcastHistory()]);
  return NextResponse.json({ members, current, history });
}

/**
 * POST { action: "test", text, buttonText?, buttonUrl?, username }
 *      { action: "start", text, buttonText?, buttonUrl? }
 *      { action: "next", id }   — sends the next batch; the page repeats until done
 *      { action: "cancel", id }
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopBotConfigured()) return NextResponse.json({ error: "The Telegram bot isn't set up yet." }, { status: 400 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action ?? "");

  if (action === "next" || action === "cancel") {
    const id = String(body?.id ?? "");
    try {
      const b = action === "next" ? await sendNextBatch(id) : await cancelBroadcast(id);
      return NextResponse.json({ current: b });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't send" }, { status: 400 });
    }
  }

  const text = String(body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Write the announcement first." }, { status: 400 });
  if (text.length > TEXT_LIMIT) return NextResponse.json({ error: `Keep it under ${TEXT_LIMIT} characters.` }, { status: 400 });
  const button = validButton(body?.buttonText as string | undefined, body?.buttonUrl as string | undefined);
  if (button === "invalid") {
    return NextResponse.json({ error: "A button needs both a short label (max 40 characters) and a link starting with https://." }, { status: 400 });
  }

  if (action === "test") {
    const ok = await sendTest(text, button, String(body?.username ?? ""));
    if (!ok) return NextResponse.json({ error: "No connected member has that @username. They must have connected the bot." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (action === "start") {
    try {
      return NextResponse.json({ current: await startBroadcast(text, button) });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't start" }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
