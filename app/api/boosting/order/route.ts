import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { boostingOrder, transaction, wallet, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMarkupNaira } from "@/lib/admin-auth";
import { getOrCreateWallet, debitWallet, creditWallet, logTransaction } from "@/lib/wallet";
import * as rss from "@/lib/boosting/really-simple-social";
import { getUSDtoNGNRate } from "@/lib/currency";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { serviceId: number; link: string; quantity: number; provider: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { serviceId, link, quantity, provider = "rss" } = body;
  if (!serviceId || !link?.trim() || !quantity || quantity < 1) {
    return NextResponse.json(
      { error: "serviceId, link, and quantity are required" },
      { status: 400 }
    );
  }

  // Fetch services (always use ReallySimpleSocial)
  const services = await rss.fetchServices();

  const service = services.find((s) => s.service === serviceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const min = parseInt(service.min, 10) || 1;
  const max = parseInt(service.max, 10) || 10000;
  const qty = Math.max(min, Math.min(max, quantity));

  const [markupNaira, rate] = await Promise.all([
    getMarkupNaira("boosting"),
    getUSDtoNGNRate(),
  ]);

  // The services API sends rate rounded to 2dp. We must use the same rounding
  // so the total here matches exactly what the user saw in the modal.
  const rateUsdPer1000 = parseFloat(service.rate) || 0;
  const rateNgnPer1000 = Number((rateUsdPer1000 * rate + markupNaira).toFixed(2));
  const totalAmountNgn = Number((rateNgnPer1000 * (qty / 1000)).toFixed(2));

  const walletRow = await getOrCreateWallet(session.user.id, "NGN");
  const balance = parseFloat(walletRow.balance);

  if (balance + 0.01 < totalAmountNgn) {
    console.log(`[Boosting] Insufficient: balance=${balance}, total=${totalAmountNgn}, rate=${rateNgnPer1000}, qty=${qty}`);
    return NextResponse.json(
      { error: `Insufficient balance (₦${balance.toFixed(2)} < ₦${totalAmountNgn.toFixed(2)}). Fund your wallet first.` },
      { status: 400 }
    );
  }

  try {
    await debitWallet(walletRow.id, totalAmountNgn.toFixed(2), "NGN");
  } catch {
    return NextResponse.json(
      { error: "Failed to debit wallet. Try again." },
      { status: 400 }
    );
  }

  let externalOrderId: number;
  try {
    const result = await rss.addOrder({
      service: serviceId,
      link: link.trim(),
      quantity: qty,
    });
    const orderIdFromApi = result?.order;
    if (orderIdFromApi == null || (typeof orderIdFromApi === "number" && orderIdFromApi <= 0)) {
      throw new Error("Supplier did not accept the order. Please check the link and try again.");
    }
    externalOrderId = Number(orderIdFromApi);
  } catch (e) {
    // Refund: credit back the debited amount so the user is not charged on failure
    try {
      await creditWallet(walletRow.id, totalAmountNgn.toFixed(2), "NGN");
      await logTransaction({
        walletId: walletRow.id,
        type: "refund",
        amount: totalAmountNgn.toFixed(2),
        currency: "NGN",
        status: "completed",
        metadata: { reason: "boosting_order_supplier_failed" },
      });
    } catch (refundErr) {
      console.error("[Boosting] Refund failed after supplier error:", refundErr);
    }
    const msg = e instanceof Error ? e.message : "Failed to place order";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const orderId = crypto.randomUUID();
  try {
    await db.insert(boostingOrder).values({
      id: orderId,
      userId: session.user.id,
      walletId: walletRow.id,
      serviceId,
      serviceName: service.name,
      category: service.category,
      link: link.trim(),
      quantity: qty,
      amount: totalAmountNgn.toFixed(2),
      currency: "NGN",
      externalOrderId,
      provider,
      status: "processing",
      externalStatus: "In progress",
    });
  } catch (e) {
    // Supplier accepted + wallet debited, but we failed to persist the order.
    // Refund to avoid charging the user for an untracked order.
    try {
      await creditWallet(walletRow.id, totalAmountNgn.toFixed(2), "NGN");
      await logTransaction({
        walletId: walletRow.id,
        type: "refund",
        amount: totalAmountNgn.toFixed(2),
        currency: "NGN",
        status: "completed",
        metadata: {
          reason: "boosting_order_internal_failed",
          externalOrderId,
          provider,
        },
      });
    } catch (refundErr) {
      console.error("[Boosting] Refund failed after internal error:", refundErr);
    }
    const msg = e instanceof Error ? e.message : "Failed to create order";
    return NextResponse.json(
      { error: `Order was sent to supplier but we couldn’t save it. Your wallet has been refunded. (${msg})` },
      { status: 500 },
    );
  }

  try {
    await logTransaction({
      walletId: walletRow.id,
      type: "order_payment",
      amount: `-${totalAmountNgn.toFixed(2)}`,
      currency: "NGN",
      status: "completed",
      externalReference: String(externalOrderId),
      metadata: {
        boostingOrderId: orderId,
        serviceId,
        serviceName: service.name,
        provider,
      },
    });
  } catch (e) {
    console.error("[Boosting] Failed to log transaction:", e);
  }

  // Admin + user email notifications (non-critical)
  try {
    const [usr] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    if (usr?.email) {
      const { sendAdminOrderNotification, sendBoostingOrderPlacedEmail } =
        await import("@/lib/email");
      await Promise.allSettled([
        sendAdminOrderNotification({
          orderId,
          orderType: "boosting",
          userEmail: usr.email,
          userName: usr.name,
          amount: totalAmountNgn.toFixed(2),
          currency: "NGN",
          serviceName: service.name,
          status: "processing",
        }),
        sendBoostingOrderPlacedEmail({
          to: usr.email,
          userName: usr.name,
          orderId,
          serviceName: service.name,
          category: service.category,
          link: link.trim(),
          quantity: qty,
          amount: totalAmountNgn.toFixed(2),
          currency: "NGN",
          status: "processing",
        }),
      ]);
    }
  } catch {
    /* non-critical */
  }

  return NextResponse.json({
    orderId,
    externalOrderId,
    amount: totalAmountNgn.toFixed(2),
    message: "Order placed successfully.",
  });
}
