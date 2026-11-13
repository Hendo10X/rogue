import { db } from "@/db/drizzle";
import { proxyOrder } from "@/db/schema";
import { creditWallet, debitWallet, getOrCreateWallet, logTransaction } from "@/lib/wallet";
import { formatAmount } from "@/lib/currency";
import { fail, type OrderResult } from "@/lib/order-result";
import type { Channel } from "@/lib/bot-pricing";
import { priceNgn, proxiesOnSale } from "./settings";
import { placeOrder, quoteUsd, type ProxySpec } from "./provider";
import { alertAdminOfOrder } from "@/lib/order-alert";
import { PROXY_TYPE_LABEL } from "./orders";

/** The ₦ price of a proxy choice (what the order will charge). */
export async function quoteProxyNgn(spec: ProxySpec, channel: Channel = "web"): Promise<number> {
  return priceNgn(await quoteUsd(spec), channel);
}

/**
 * Orders proxies for a user: re-prices on the server, charges the wallet,
 * then orders from the supplier. Any failure after the charge refunds it.
 * Used by the website (/api/proxies/order) and the Telegram bot.
 */
export async function placeProxyOrder(
  userId: string,
  spec: ProxySpec,
  { channel = "web" }: { channel?: Channel } = {},
): Promise<OrderResult<{ ok: true; id: string }>> {
  if (!(await proxiesOnSale())) return fail(503, "Proxies aren't available right now.");
  const { country, period, quantity } = spec;

  let amount: number;
  try {
    amount = await quoteProxyNgn(spec, channel);
  } catch (err) {
    return fail(502, err instanceof Error ? err.message : "Couldn't get a price");
  }
  const total = amount.toFixed(2);

  const wallet = await getOrCreateWallet(userId, "NGN");
  if (parseFloat(wallet.balance) + 0.01 < amount) {
    return fail(400, `Insufficient balance (₦${formatAmount(wallet.balance)} < ₦${formatAmount(amount)}). Fund your wallet first.`);
  }
  try {
    await debitWallet(wallet.id, total, "NGN");
  } catch {
    return fail(400, "Failed to debit wallet. Try again.");
  }

  const refund = async (reason: string, extra: Record<string, unknown> = {}) => {
    try {
      await creditWallet(wallet.id, total, "NGN");
      await logTransaction({ walletId: wallet.id, type: "refund", amount: total, currency: "NGN", metadata: { reason, ...extra } });
    } catch (err) {
      console.error("[Proxies] refund failed", reason, err);
    }
  };

  let placed: { orderId: string; costUsd: number | null };
  try {
    placed = await placeOrder(spec);
  } catch (err) {
    console.error("[Proxies] supplier order failed", err);
    await refund("proxy_order_supplier_failed");
    return fail(502, "We couldn't get these proxies right now. You haven't been charged — please try again in a few minutes.");
  }

  const id = crypto.randomUUID();
  try {
    await db.insert(proxyOrder).values({
      id,
      userId,
      walletId: wallet.id,
      providerOrderId: placed.orderId,
      proxyType: spec.type,
      country,
      period,
      quantity,
      amount: total,
      costUsd: placed.costUsd != null ? placed.costUsd.toFixed(2) : null,
      status: "processing",
    });
  } catch (err) {
    // Bought from the supplier but not recorded: refund and log the supplier id for support.
    console.error("[Proxies] saving order failed", placed.orderId, err);
    await refund("proxy_order_internal_failed", { providerOrderId: placed.orderId });
    return fail(500, "We couldn't save your order. Your wallet has been refunded.");
  }

  await logTransaction({
    walletId: wallet.id,
    type: "order_payment",
    amount: `-${total}`,
    currency: "NGN",
    externalReference: placed.orderId,
    metadata: { kind: "proxy", proxyType: spec.type, proxyOrderId: id, country, period, quantity, channel },
  }).catch((err) => console.error("[Proxies] transaction log failed", err));

  // Admin Telegram alert, like logs and boosting (never blocks or fails the order).
  await alertAdminOfOrder({
    userId,
    orderId: id,
    orderType: "proxy",
    amountNgn: total,
    description: `${quantity} × ${PROXY_TYPE_LABEL[spec.type]} · ${country} · ${period}`,
    channel,
  });

  return { ok: true, data: { ok: true, id } };
}
