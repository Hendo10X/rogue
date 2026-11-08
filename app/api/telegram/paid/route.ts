import { NextRequest, NextResponse } from "next/server";
import { creditFlutterwaveDeposit } from "@/lib/flutterwave";
import { tg } from "@/lib/telegram-bot/api";

export const dynamic = "force-dynamic";

// Flutterwave sends bot customers here after paying. Credit the wallet right
// away (the webhook would too, a little later), then send them back to the bot.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const txRef = p.get("tx_ref");
  if (txRef && p.get("status") !== "cancelled") {
    await creditFlutterwaveDeposit(txRef, { transactionId: p.get("transaction_id"), source: "telegram_redirect" }).catch((err) =>
      console.error("[ShopBot] paid redirect credit failed", err),
    );
  }
  const me = await tg<{ username?: string }>("getMe", {});
  return NextResponse.redirect(me?.username ? `https://t.me/${me.username}` : new URL("/", req.url));
}
