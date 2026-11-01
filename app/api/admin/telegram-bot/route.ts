import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { telegramAccount } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-route";
import { SITE_URL } from "@/lib/site";
import { shopBotConfigured, tg } from "@/lib/telegram-bot/api";

export const dynamic = "force-dynamic";

const WEBHOOK = `${SITE_URL}/api/telegram/bot`;

// GET — is the shop bot set up, connected, and how many customers use it.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopBotConfigured()) return NextResponse.json({ configured: false });
  const [me, hook, count] = await Promise.all([
    tg<{ username?: string }>("getMe", {}),
    tg<{ url?: string; last_error_message?: string }>("getWebhookInfo", {}),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(telegramAccount)
      .then((r: { n: number }[]) => r[0]?.n ?? 0)
      .catch(() => null),
  ]);
  return NextResponse.json({
    configured: true,
    username: me?.username ?? null,
    connected: hook?.url === WEBHOOK,
    lastError: hook?.last_error_message ?? null,
    customers: count,
  });
}

// POST — points the bot at this site and sets its command menu.
export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const secret = process.env.TELEGRAM_SHOP_BOT_SECRET?.trim();
  if (!shopBotConfigured() || !secret) {
    return NextResponse.json({ error: "Add TELEGRAM_SHOP_BOT_TOKEN and TELEGRAM_SHOP_BOT_SECRET in Vercel first." }, { status: 400 });
  }
  const ok = await tg("setWebhook", {
    url: WEBHOOK,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  if (!ok) return NextResponse.json({ error: "Telegram didn't accept the connection. Check the bot token." }, { status: 502 });
  await tg("setMyCommands", {
    commands: [
      { command: "menu", description: "Main menu" },
      { command: "fund", description: "Fund your wallet" },
      { command: "balance", description: "Your balance" },
      { command: "orders", description: "Your orders and login details" },
      { command: "help", description: "How it works" },
    ],
  });
  return NextResponse.json({ ok: true });
}
