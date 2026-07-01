import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import {
  listing,
  supplier,
  order,
  supplierOrder,
  accountDelivery,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  authenticateApiRequest,
  getApiMarkupPercent,
  applyApiMarkup,
  ApiErrors,
} from "@/lib/api-auth";
import { getUSDtoNGNRate } from "@/lib/currency";
import {
  getOrCreateWallet,
  debitWallet,
  creditWallet,
  logTransaction,
} from "@/lib/wallet";
import { purchaseFromSupplier } from "@/lib/suppliers/adapter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function err502(message: string) {
  return new NextResponse(JSON.stringify({ error: message }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}

// POST /api/v1/logs/:slug/buy — buy an auto-fulfilled log via the API.
// Body: { "quantity": number }  (defaults to 1)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  const { slug } = await params;
  let body: { quantity?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* quantity optional */
  }
  const quantity = Math.max(1, Math.min(1000, Number(body.quantity) || 1));

  const [list] = await db
    .select({
      id: listing.id,
      externalProductId: listing.externalProductId,
      supplierId: listing.supplierId,
      title: listing.title,
      supplierPrice: listing.supplierPrice,
      stock: listing.stock,
      platform: listing.platform,
      metadata: listing.metadata,
    })
    .from(listing)
    .where(eq(listing.slug, slug))
    .limit(1);

  if (!list) return ApiErrors.notFound("Log not found");

  const isManual = !!(list.metadata && (list.metadata as any).manual === true);
  if (isManual) {
    return ApiErrors.badRequest(
      "This log requires manual delivery and cannot be bought via the API.",
    );
  }
  if (list.stock < quantity) return ApiErrors.badRequest("Insufficient stock");

  const [sup] = await db
    .select()
    .from(supplier)
    .where(eq(supplier.id, list.supplierId))
    .limit(1);
  if (!sup?.apiUrl || !sup?.apiKey || sup.apiUrl.startsWith("manual")) {
    return ApiErrors.badRequest(
      "This log isn't available for automated delivery.",
    );
  }

  const [apiMarkup, rate] = await Promise.all([
    getApiMarkupPercent(),
    getUSDtoNGNRate(),
  ]);
  const unitPriceNgn = Math.round(
    applyApiMarkup(parseFloat(list.supplierPrice), apiMarkup) * rate,
  );
  const totalAmount = (unitPriceNgn * quantity).toFixed(2);

  const walletRow = await getOrCreateWallet(auth.userId, "NGN");
  if (parseFloat(walletRow.balance) + 0.01 < parseFloat(totalAmount)) {
    return ApiErrors.badRequest(
      `Insufficient balance (NGN ${walletRow.balance} < NGN ${totalAmount}). Fund your wallet first.`,
    );
  }

  try {
    await debitWallet(walletRow.id, totalAmount, "NGN");
  } catch {
    return ApiErrors.badRequest("Failed to debit wallet. Try again.");
  }

  const orderId = crypto.randomUUID();
  await db.insert(order).values({
    id: orderId,
    userId: auth.userId,
    listingId: list.id,
    status: "processing",
    amount: totalAmount,
    currency: "NGN",
    quantity,
    walletId: walletRow.id,
    metadata: { via: "api" },
  });

  try {
    const result = await purchaseFromSupplier(
      { baseUrl: sup.apiUrl, apiKey: sup.apiKey },
      list.externalProductId,
      quantity,
    );
    if (result.status !== "success" || !result.trans_id) {
      throw new Error(result.msg ?? "Supplier rejected the order");
    }

    const credentials = result.data ?? [];
    const parts = (credentials[0] || "").split(":");

    await db.insert(supplierOrder).values({
      id: crypto.randomUUID(),
      orderId,
      supplierId: sup.id,
      externalId: result.trans_id,
      status: "completed",
      responsePayload: result as any,
    });
    await db.insert(accountDelivery).values({
      id: crypto.randomUUID(),
      orderId,
      platform: list.platform,
      username: parts[0] || null,
      password: parts[1] || null,
      email: parts[2] || null,
      emailPassword: parts[3] || null,
      deliveryStatus: "delivered",
      deliveredAt: new Date(),
      notes: credentials.join("\n"),
    });
    await logTransaction({
      walletId: walletRow.id,
      type: "order_payment",
      amount: `-${totalAmount}`,
      currency: "NGN",
      status: "completed",
      orderId,
      externalReference: result.trans_id,
      metadata: { via: "api", listingSlug: slug },
    });
    await db
      .update(listing)
      .set({ stock: list.stock - quantity, updatedAt: new Date() })
      .where(eq(listing.id, list.id));
    await db
      .update(order)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(order.id, orderId));

    return NextResponse.json({
      data: {
        order_id: orderId,
        status: "completed",
        charge: totalAmount,
        currency: "NGN",
        quantity,
        credentials,
      },
    });
  } catch (e) {
    // API buyers can't wait on manual review — refund and fail cleanly.
    try {
      await creditWallet(walletRow.id, totalAmount, "NGN");
      await logTransaction({
        walletId: walletRow.id,
        type: "refund",
        amount: totalAmount,
        currency: "NGN",
        status: "completed",
        metadata: { reason: "api_log_purchase_failed", orderId },
      });
      await db
        .update(order)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(order.id, orderId));
    } catch {
      /* best effort */
    }
    const msg = e instanceof Error ? e.message : "Supplier failed";
    return err502(`Order failed and your wallet was refunded. (${msg})`);
  }
}
