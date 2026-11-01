import { NextRequest, NextResponse } from "next/server";
import { handleUpdate, type Update } from "@/lib/telegram-bot/handler";

export const dynamic = "force-dynamic";
// A purchase can wait on the supplier.
export const maxDuration = 60;

// Telegram posts every bot update here (registered from admin Settings).
// The secret header proves the request really comes from Telegram.
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_SHOP_BOT_SECRET?.trim();
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as Update | null;
  if (update) {
    try {
      await handleUpdate(update);
    } catch (err) {
      // Always answer 200, or Telegram keeps retrying the same update.
      console.error("[ShopBot] update failed", err);
    }
  }
  return NextResponse.json({ ok: true });
}
