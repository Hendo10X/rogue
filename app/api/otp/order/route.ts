import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { otpOrder } from "@/db/schema";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { creditWallet, debitWallet, getOrCreateWallet, logTransaction } from "@/lib/wallet";
import { formatAmount } from "@/lib/currency";
import { forgetApps, getApps, otpOnSale, otpPriceNgn } from "@/lib/otp/settings";
import { buyNumber, cancelNumber, fetchAppLive } from "@/lib/otp/provider";
import { looksOutOfStock, markOutOfStock } from "@/lib/otp/stock";

export const dynamic = "force-dynamic";

// POST { country, app } — checks 5sim's live stock and price for this app,
// charges the wallet, then buys the number. Any failure after the charge refunds it.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isUserSuspended(session.user.id)) return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 403 });
  if (!(await otpOnSale())) return NextResponse.json({ error: "OTP numbers aren't available right now." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { country?: unknown; app?: unknown } | null;
  const country = typeof body?.country === "string" ? body.country.trim() : "";
  const appName = typeof body?.app === "string" ? body.app.trim() : "";
  if (!country || !appName) return NextResponse.json({ error: "Pick a country and an app." }, { status: 400 });

  // `hide` only when 5sim refused a number it listed as in stock; a plain
  // zero count clears itself when 5sim restocks, so it isn't hidden for good.
  const soldOut = async (hide = false) => {
    if (hide) await markOutOfStock(country, appName).catch(() => {});
    forgetApps(country);
    return NextResponse.json({ soldOut: true, error: "This app just sold out for this country." }, { status: 409 });
  };

  let costUsd: number;
  try {
    if (!(await getApps(country)).some((a) => a.name === appName)) return soldOut();
    // Fresh check right before charging: the list on screen may be a few seconds old.
    const live = await fetchAppLive(country, appName);
    if (!live) return soldOut();
    costUsd = live.priceUsd;
  } catch {
    return NextResponse.json({ error: "We couldn't get a price right now. Please try again." }, { status: 502 });
  }
  const amount = await otpPriceNgn(costUsd);
  const total = amount.toFixed(2);

  const wallet = await getOrCreateWallet(session.user.id, "NGN");
  if (parseFloat(wallet.balance) + 0.01 < amount) {
    return NextResponse.json(
      { error: `Insufficient balance (₦${formatAmount(wallet.balance)} < ₦${formatAmount(amount)}). Fund your wallet first.` },
      { status: 400 },
    );
  }
  try {
    await debitWallet(wallet.id, total, "NGN");
  } catch {
    return NextResponse.json({ error: "We couldn't take the payment from your wallet. Please try again." }, { status: 400 });
  }

  const refund = async (reason: string) => {
    try {
      await creditWallet(wallet.id, total, "NGN");
      await logTransaction({ walletId: wallet.id, type: "refund", amount: total, currency: "NGN", metadata: { reason } });
    } catch (err) {
      console.error("[OTP] refund failed", reason, err);
    }
  };

  let bought: { numberId: string; number: string; priceUsd: number | null };
  try {
    bought = await buyNumber(country, appName, costUsd);
  } catch (err) {
    console.error("[OTP] buying number failed", err);
    await refund("otp_buy_failed");
    // 5sim listed it but had no number to give: hide it for this country.
    if (looksOutOfStock(err instanceof Error ? err.message : String(err))) return soldOut(true);
    return NextResponse.json(
      { error: "We couldn't get a number right now. You haven't been charged — please try again in a few minutes." },
      { status: 502 },
    );
  }


  const id = crypto.randomUUID();
  try {
    await db.insert(otpOrder).values({
      id,
      userId: session.user.id,
      walletId: wallet.id,
      providerNumberId: bought.numberId,
      country,
      app: appName,
      number: bought.number,
      amount: total,
      costUsd: costUsd.toFixed(4),
    });
  } catch (err) {
    console.error("[OTP] saving order failed", bought.numberId, err);
    await cancelNumber(bought.numberId).catch(() => {});
    await refund("otp_save_failed");
    return NextResponse.json({ error: "Something went wrong. Your money has been put back in your wallet." }, { status: 500 });
  }

  await logTransaction({
    walletId: wallet.id,
    type: "order_payment",
    amount: `-${total}`,
    currency: "NGN",
    externalReference: bought.numberId,
    metadata: { kind: "otp", otpOrderId: id, country, app: appName },
  }).catch((err) => console.error("[OTP] transaction log failed", err));

  return NextResponse.json({ ok: true, id, number: bought.number });
}
