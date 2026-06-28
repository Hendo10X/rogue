import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { boostingOrder } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  authenticateApiRequest,
  getApiUserDiscountPercent,
  applyApiDiscount,
  ApiErrors,
} from "@/lib/api-auth";
import { getMarkupNaira } from "@/lib/admin-auth";
import {
  getOrCreateWallet,
  debitWallet,
  creditWallet,
  logTransaction,
} from "@/lib/wallet";
import * as socially from "@/lib/boosting/socially";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/v1/orders — list the API user's orders (most recent first).
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  const rows = await db
    .select()
    .from(boostingOrder)
    .where(eq(boostingOrder.userId, auth.userId))
    .orderBy(desc(boostingOrder.createdAt))
    .limit(100);

  return NextResponse.json({
    data: rows.map((o) => ({
      id: o.id,
      service: o.serviceId,
      service_name: o.serviceName,
      link: o.link,
      quantity: o.quantity,
      charge: o.amount,
      currency: o.currency,
      status: o.status,
      external_status: o.externalStatus,
      external_order_id: o.externalOrderId,
      created_at: o.createdAt,
    })),
  });
}

// POST /api/v1/orders — place a boosting order at the discounted API rate.
export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  let body: { service?: number; link?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest("Invalid JSON body");
  }

  const serviceId = Number(body.service);
  const link = body.link?.trim();
  const quantity = Number(body.quantity);
  if (!serviceId || !link || !quantity || quantity < 1) {
    return ApiErrors.badRequest(
      "'service' (number), 'link' (string) and 'quantity' (number) are required",
    );
  }

  const services = await socially.fetchServices();
  const service = services.find((s) => s.service === serviceId);
  if (!service) return ApiErrors.notFound("Service not found");

  const min = parseInt(service.min, 10) || 1;
  const max = parseInt(service.max, 10) || 10000;
  const qty = Math.max(min, Math.min(max, quantity));

  const [markupNaira, discount] = await Promise.all([
    getMarkupNaira("boosting"),
    getApiUserDiscountPercent(),
  ]);

  // socially.ng rates are already in NGN per 1000.
  const normalRate = (parseFloat(service.rate) || 0) + markupNaira;
  const apiRate = applyApiDiscount(normalRate, discount);
  const totalAmountNgn = Number((apiRate * (qty / 1000)).toFixed(2));

  const walletRow = await getOrCreateWallet(auth.userId, "NGN");
  const balance = parseFloat(walletRow.balance);
  if (balance + 0.01 < totalAmountNgn) {
    return ApiErrors.badRequest(
      `Insufficient balance (₦${balance.toFixed(2)} < ₦${totalAmountNgn.toFixed(2)}). Fund your wallet first.`,
    );
  }

  try {
    await debitWallet(walletRow.id, totalAmountNgn.toFixed(2), "NGN");
  } catch {
    return ApiErrors.badRequest("Failed to debit wallet. Try again.");
  }

  let externalOrderId: number;
  try {
    const result = await socially.addOrder({ service: serviceId, link, quantity: qty });
    externalOrderId = Number(result?.order);
    if (!Number.isFinite(externalOrderId) || externalOrderId <= 0) {
      throw new Error("Supplier did not accept the order. Check the link and try again.");
    }
  } catch (e) {
    // Refund on supplier failure.
    try {
      await creditWallet(walletRow.id, totalAmountNgn.toFixed(2), "NGN");
      await logTransaction({
        walletId: walletRow.id,
        type: "refund",
        amount: totalAmountNgn.toFixed(2),
        currency: "NGN",
        status: "completed",
        metadata: { reason: "api_order_supplier_failed" },
      });
    } catch {
      /* swallow */
    }
    const msg = e instanceof Error ? e.message : "Failed to place order with supplier";
    return new NextResponse(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const orderId = crypto.randomUUID();
  try {
    await db.insert(boostingOrder).values({
      id: orderId,
      userId: auth.userId,
      walletId: walletRow.id,
      serviceId,
      serviceName: service.name,
      category: service.category,
      link,
      quantity: qty,
      amount: totalAmountNgn.toFixed(2),
      currency: "NGN",
      externalOrderId,
      provider: "api",
      status: "processing",
      externalStatus: "In progress",
    });
  } catch (e) {
    try {
      await creditWallet(walletRow.id, totalAmountNgn.toFixed(2), "NGN");
      await logTransaction({
        walletId: walletRow.id,
        type: "refund",
        amount: totalAmountNgn.toFixed(2),
        currency: "NGN",
        status: "completed",
        metadata: { reason: "api_order_internal_failed", externalOrderId },
      });
    } catch {
      /* swallow */
    }
    return ApiErrors.server("Order sent to supplier but could not be saved; you were refunded.");
  }

  try {
    await logTransaction({
      walletId: walletRow.id,
      type: "order_payment",
      amount: `-${totalAmountNgn.toFixed(2)}`,
      currency: "NGN",
      status: "completed",
      externalReference: String(externalOrderId),
      metadata: { boostingOrderId: orderId, serviceId, provider: "api" },
    });
  } catch {
    /* non-critical */
  }

  return NextResponse.json({
    data: {
      id: orderId,
      external_order_id: externalOrderId,
      charge: totalAmountNgn.toFixed(2),
      currency: "NGN",
      discount_percent: discount,
      status: "processing",
    },
  });
}
