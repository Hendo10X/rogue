import { NextResponse } from "next/server";
import { botUsername } from "@/lib/telegram-bot/api";

export const dynamic = "force-dynamic";

// GET — the shop bot's t.me link for the floating button, or null when the bot isn't set up.
// Cached at the edge for an hour so pages never wait on Telegram.
export async function GET() {
  const name = await botUsername().catch(() => null);
  return NextResponse.json(
    { url: name ? `https://t.me/${name}` : null },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
