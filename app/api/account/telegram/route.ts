import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { linkedTelegram, redeemLinkCode, unlinkTelegram } from "@/lib/telegram-bot/link";

export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

// GET — is a Telegram account connected?
export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const linked = await linkedTelegram(id);
  return NextResponse.json({ linked: !!linked, username: linked?.username ?? null });
}

// POST { code } — connect the Telegram account that got this code in the bot.
export async function POST(req: NextRequest) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isUserSuspended(id)) return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const result = await redeemLinkCode(typeof body?.code === "string" ? body.code : "", id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ linked: true, username: result.telegramUsername });
}

// DELETE — disconnect Telegram (wallet and orders stay on the website account).
export async function DELETE() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await unlinkTelegram(id);
  return NextResponse.json({ linked: false, username: null });
}
