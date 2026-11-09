import { db } from "@/db/drizzle";
import { otpOrder } from "@/db/schema";
import { creditWallet, debitWallet, getOrCreateWallet, logTransaction } from "@/lib/wallet";
import { formatAmount } from "@/lib/currency";
import { fail, type OrderResult } from "@/lib/order-result";
import type { Channel } from "@/lib/bot-pricing";
import { forgetApps, getApps, otpOnSale, otpPriceNgn } from "./settings";
import { buyNumber, cancelNumber, fetchAppLive, type Quote } from "./provider";
import { looksOutOfStock, markOutOfStock } from "./stock";

export type OtpOrderPlaced = { ok: true; id: string; number: string };

/**
 * Buys an OTP number for a user: asks every switched-on provider (GrizzlySMS,
 * SMSPool) for a live price, charges the wallet at the cheapest, then buys
 * from that provider capped at that price. Any failure after the charge
 * refunds it. Used by the website (/api/otp/order) and the Telegram bot.
 */
export async function placeOtpOrder(
  userId: string,
  input: { country: string; app: string },
  { channel = "web" }: { channel?: Channel } = {},
): Promise<OrderResult<OtpOrderPlaced>> {
  if (!(await otpOnSale())) return fail(503, "OTP numbers aren't available right now.");
  const country = input.country.trim();
  const appName = input.app.trim();
  if (!country || !appName) return fail(400, "Pick a country and an app.");

  // `hide` only when a provider refused a number it quoted as in stock; a plain
  // zero count clears itself when providers restock, so it isn't hidden for good.
  const soldOut = async (hide = false) => {
    if (hide) await markOutOfStock(country, appName).catch(() => {});
    forgetApps(country);
    return fail(409, "This app just sold out for this country.", { soldOut: true });
  };

  let quote: Quote;
  try {
    if (!(await getApps(country)).some((a) => a.name === appName)) return soldOut();
    // Fresh check right before charging: the list on screen may be a few seconds old.
    const live = await fetchAppLive(country, appName);
    if (!live) return soldOut();
    quote = live;
  } catch {
    return fail(502, "We couldn't get a price right now. Please try again.");
  }
  const costUsd = quote.priceUsd;
  // The bot charges its own price when an admin set one; the website its usual price.
  const amount = await otpPriceNgn(costUsd, channel);
  const total = amount.toFixed(2);

  const wallet = await getOrCreateWallet(userId, "NGN");
  if (parseFloat(wallet.balance) + 0.01 < amount) {
    return fail(400, `Insufficient balance (₦${formatAmount(wallet.balance)} < ₦${formatAmount(amount)}). Fund your wallet first.`);
  }
  try {
    await debitWallet(wallet.id, total, "NGN");
  } catch {
    return fail(400, "We couldn't take the payment from your wallet. Please try again.");
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
    bought = await buyNumber(country, appName, quote);
  } catch (err) {
    console.error("[OTP] buying number failed", err);
    await refund("otp_buy_failed");
    // The provider quoted it but had no number to give: hide it for this country.
    if (looksOutOfStock(err instanceof Error ? err.message : String(err))) return soldOut(true);
    return fail(502, "We couldn't get a number right now. You haven't been charged — please try again in a few minutes.");
  }

  const id = crypto.randomUUID();
  try {
    await db.insert(otpOrder).values({
      id,
      userId,
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
    return fail(500, "Something went wrong. Your money has been put back in your wallet.");
  }

  await logTransaction({
    walletId: wallet.id,
    type: "order_payment",
    amount: `-${total}`,
    currency: "NGN",
    externalReference: bought.numberId,
    metadata: { kind: "otp", otpOrderId: id, country, app: appName, channel, provider: quote.provider, ...(quote.pool ? { pool: quote.pool } : {}) },
  }).catch((err) => console.error("[OTP] transaction log failed", err));

  return { ok: true, data: { ok: true, id, number: bought.number } };
}
