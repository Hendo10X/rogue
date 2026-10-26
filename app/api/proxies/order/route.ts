import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { proxyOrder } from "@/db/schema";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { creditWallet, debitWallet, getOrCreateWallet, logTransaction } from "@/lib/wallet";
import { formatAmount } from "@/lib/currency";
import { priceNgn, proxiesOnSale } from "@/lib/proxies/settings";
import { parseProxySpec } from "@/lib/proxies/spec";
import { placeOrder, quoteUsd } from "@/lib/proxies/provider";

export const dynamic = "force-dynamic";

// POST { type, country, period, quantity, … } — re-prices on the server, charges the
// wallet, then orders from the supplier. Any failure after the charge refunds it.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isUserSuspended(session.user.id)) return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 403 });
  if (!(await proxiesOnSale())) return NextResponse.json({ error: "Proxies aren't available right now." }, { status: 503 });

  const spec = parseProxySpec(await req.json().catch(() => null));
  if (!spec) return NextResponse.json({ error: "Pick every option first." }, { status: 400 });
  const { country, period, quantity } = spec;

  let amount: number;
  try {
    amount = await priceNgn(await quoteUsd(spec));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't get a price" }, { status: 502 });
  }
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
    return NextResponse.json({ error: "Failed to debit wallet. Try again." }, { status: 400 });
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
    return NextResponse.json(
      { error: "The proxy supplier couldn't fill this order right now. You haven't been charged." },
      { status: 502 },
    );
  }

  const id = crypto.randomUUID();
  try {
    await db.insert(proxyOrder).values({
      id,
      userId: session.user.id,
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
    return NextResponse.json({ error: "We couldn't save your order. Your wallet has been refunded." }, { status: 500 });
  }

  await logTransaction({
    walletId: wallet.id,
    type: "order_payment",
    amount: `-${total}`,
    currency: "NGN",
    externalReference: placed.orderId,
    metadata: { kind: "proxy", proxyType: spec.type, proxyOrderId: id, country, period, quantity },
  }).catch((err) => console.error("[Proxies] transaction log failed", err));

  return NextResponse.json({ ok: true, id });
}
