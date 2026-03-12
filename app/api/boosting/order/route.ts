import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { boostingOrder, transaction, wallet, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMarkupNaira } from "@/lib/admin-auth";
import { getOrCreateWallet, debitWallet, logTransaction } from "@/lib/wallet";
import * as rss from "@/lib/boosting/really-simple-social";
import * as rp from "@/lib/boosting/reseller-provider";
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

  // Fetch services from the specific provider
  let services;
  if (provider === "rp") {
    services = await rp.fetchServices();
  } else {
    services = await rss.fetchServices();
  }

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

  const rateUsd = parseFloat(service.rate) || 0;
  const unitPriceNgn = rateUsd * rate + markupNaira;
  const totalAmountNgn = unitPriceNgn * qty;

  const walletRow = await getOrCreateWallet(session.user.id, "NGN");
  const balance = parseFloat(walletRow.balance);

  if (balance < totalAmountNgn) {
    return NextResponse.json(
      { error: "Insufficient wallet balance. Fund your wallet first." },
      { status: 400 }
    );
  }

  try {
    await debitWallet(walletRow.id, String(totalAmountNgn), "NGN");
  } catch {
    return NextResponse.json(
      { error: "Failed to debit wallet. Try again." },
      { status: 400 }
    );
  }

  let externalOrderId: number;
  try {
    if (provider === "rp") {
      const result = await rp.addOrder({
        service: serviceId,
        link: link.trim(),
        quantity: qty,
      });
      externalOrderId = result.order;
    } else {
      const result = await rss.addOrder({
        service: serviceId,
        link: link.trim(),
        quantity: qty,
      });
      externalOrderId = result.order;
    }
  } catch (e) {
    // Refund on failure
    await db
      .update(wallet)
      .set({
        balance: (balance).toFixed(8),
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id));
    const msg = e instanceof Error ? e.message : "Failed to place order";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const orderId = crypto.randomUUID();
  await db.insert(boostingOrder).values({
    id: orderId,
    userId: session.user.id,
    walletId: walletRow.id,
    serviceId,
    serviceName: service.name,
    category: service.category,
    link: link.trim(),
    quantity: qty,
    amount: String(totalAmountNgn),
    currency: "NGN",
    externalOrderId,
    provider,
    status: "processing",
    externalStatus: "In progress",
  });

  await logTransaction({
    walletId: walletRow.id,
    type: "order_payment",
    amount: `-${totalAmountNgn}`,
    currency: "NGN",
    status: "completed",
    externalReference: String(externalOrderId),
    metadata: { boostingOrderId: orderId, serviceId, serviceName: service.name, provider },
  });

  // Admin email notification
  try {
    const [usr] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    if (usr?.email) {
      const { sendAdminOrderNotification } = await import("@/lib/email");
      await sendAdminOrderNotification({
        orderId,
        orderType: "boosting",
        userEmail: usr.email,
        userName: usr.name,
        amount: String(totalAmountNgn),
        currency: "NGN",
        serviceName: service.name,
        status: "processing",
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({
    orderId,
    externalOrderId,
    amount: String(totalAmountNgn),
    message: "Order placed successfully.",
  });
}
