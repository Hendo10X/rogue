import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import {
  listing,
  supplier,
  order,
  wallet,
  supplierOrder,
  accountDelivery,
  transaction,
  user,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getOrCreateWallet,
  debitWallet,
  creditWallet,
  logTransaction,
} from "@/lib/wallet";
import { getUSDtoNGNRate } from "@/lib/currency";
import { getMarketplacePricing, computeMarketplacePriceNgn } from "@/lib/pricing";
import { purchaseFromSupplier } from "@/lib/suppliers/adapter";

export const maxDuration = 60; // Allow enough time for supplier API and Email

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listingSlug: string; quantity: number; coupon?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const quantity = Math.max(1, Math.min(1000, body.quantity ?? 1));

  const [list] = await db
    .select({
      id: listing.id,
      externalProductId: listing.externalProductId,
      supplierId: listing.supplierId,
      title: listing.title,
      price: listing.price,
      supplierPrice: listing.supplierPrice,
      stock: listing.stock,
      platform: listing.platform,
      metadata: listing.metadata,
    })
    .from(listing)
    .where(eq(listing.slug, body.listingSlug))
    .limit(1);

  if (!list) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (list.stock < quantity) {
    return NextResponse.json(
      { error: "Insufficient stock" },
      { status: 400 }
    );
  }

  const isManual =
    !!(list.metadata && (list.metadata as any).manual === true);

  let sup: (typeof supplier)["$inferSelect"] | undefined;
  if (!isManual) {
    [sup] = await db
      .select()
      .from(supplier)
      .where(eq(supplier.id, list.supplierId))
      .limit(1);

    if (!sup?.apiUrl || !sup?.apiKey) {
      return NextResponse.json(
        { error: "Supplier not configured" },
        { status: 500 }
      );
    }
  }

  const [pricing, rate] = await Promise.all([
    getMarketplacePricing(),
    getUSDtoNGNRate(),
  ]);

  // Charge the same price customers see: manual logs use their admin-set NGN
  // price, supplier logs use the tiered model.
  const unitPriceNgn = isManual
    ? Math.round(parseFloat(list.price))
    : computeMarketplacePriceNgn(parseFloat(list.supplierPrice), rate, pricing);
  const totalAmount = (unitPriceNgn * quantity).toFixed(2);

  const walletRow = await getOrCreateWallet(session.user.id, "NGN");

  const balance = parseFloat(walletRow.balance);

  if (balance < parseFloat(totalAmount)) {
    return NextResponse.json(
      { error: "Insufficient wallet balance. Fund your wallet first." },
      { status: 400 }
    );
  }

  const orderId = crypto.randomUUID();

  // 1. Debit wallet
  try {
    await debitWallet(walletRow.id, totalAmount, "NGN");
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to debit wallet. Try again." },
      { status: 400 }
    );
  }

  // 2. Initial order record
  await db.insert(order).values({
    id: orderId,
    userId: session.user.id,
    listingId: list.id,
    status: isManual ? "manual_review" : "processing",
    amount: totalAmount,
    currency: "NGN",
    quantity,
    walletId: walletRow.id,
    metadata: {
      coupon: body.coupon,
      ...(isManual ? { manual: true } : {}),
    },
  });

  // If this is a manual listing, we stop here and let admin fulfill.
  if (isManual) {
    await db.insert(accountDelivery).values({
      id: crypto.randomUUID(),
      orderId,
      platform: list.platform,
      deliveryStatus: "pending",
      notes: "Manual listing purchase — awaiting admin delivery.",
    });

    await db.insert(transaction).values({
      id: crypto.randomUUID(),
      walletId: walletRow.id,
      type: "order_payment",
      amount: `-${totalAmount}`,
      currency: "NGN",
      status: "completed",
      orderId,
    });

    try {
      const [usr] = await db
        .select()
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);
      if (usr?.email) {
        const { sendAdminOrderNotification } = await import("@/lib/email");
        await sendAdminOrderNotification({
          orderId,
          orderType: "marketplace",
          userEmail: usr.email,
          userName: usr.name,
          amount: totalAmount,
          currency: "NGN",
          platform: list.platform,
          status: "manual_review — manual listing",
        });
      }
    } catch {
      // non-critical
    }

    return NextResponse.json({
      orderId,
      status: "manual_review",
      message:
        "Order placed successfully. Admin will deliver the credentials shortly.",
    });
  }

  // 3. Talk to Supplier for non-manual listings
  try {
    if (!sup) {
      throw new Error("Supplier not configured");
    }

    console.log(`[PurchaseAPI] Calling supplier:`, {
      orderId,
      supplierId: sup.id,
      supplierName: sup.name,
      baseUrl: sup.apiUrl,
      productId: list.externalProductId,
      quantity,
    });

    const purchaseResult = await purchaseFromSupplier(
      { baseUrl: sup.apiUrl, apiKey: sup.apiKey },
      list.externalProductId,
      quantity,
      body.coupon
    );

    console.log(`[PurchaseAPI] Supplier response for order ${orderId}:`, JSON.stringify(purchaseResult));

    if (purchaseResult.status !== "success" || !purchaseResult.trans_id) {
      throw new Error(purchaseResult.msg ?? `Supplier returned: ${JSON.stringify(purchaseResult)}`);
    }

    // Success flow
    await db.insert(supplierOrder).values({
      id: crypto.randomUUID(),
      orderId,
      supplierId: sup.id,
      externalId: purchaseResult.trans_id,
      status: "completed",
      responsePayload: purchaseResult as any,
    });

    const credentials = purchaseResult.data ?? [];
    const deliveryData = credentials.join("\n");
    const parts = (credentials[0] || "").split(":");

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
      notes: deliveryData,
    });

    await db.insert(transaction).values({
      id: crypto.randomUUID(),
      walletId: walletRow.id,
      type: "order_payment",
      amount: `-${totalAmount}`,
      currency: "NGN",
      status: "completed",
      orderId,
      externalReference: purchaseResult.trans_id,
    });

    await db.update(listing).set({
      stock: list.stock - quantity,
      updatedAt: new Date(),
    }).where(eq(listing.id, list.id));

    await db.update(order).set({ status: "completed", updatedAt: new Date() }).where(eq(order.id, orderId));

    // Email Delivery + Admin Notification
    const [usr] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    if (usr?.email) {
      try {
        const { sendOrderDeliveryEmail, sendAdminOrderNotification } = await import("@/lib/email");
        await Promise.allSettled([
          sendOrderDeliveryEmail({
            to: usr.email,
            orderId,
            platform: list.platform,
            details: {
              username: parts[0],
              password: parts[1],
              email: parts[2],
              emailPassword: parts[3],
              notes: deliveryData,
            },
          }),
          sendAdminOrderNotification({
            orderId,
            orderType: "marketplace",
            userEmail: usr.email,
            userName: usr.name,
            amount: totalAmount,
            currency: "NGN",
            platform: list.platform,
            status: "completed",
          }),
        ]);
      } catch (ee) {
        console.error("Email delivery failed:", ee);
      }
    }

    return NextResponse.json({
      orderId,
      message: "Purchase successful! Your credentials have been emailed.",
      status: "completed",
      credentials: credentials,
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[PurchaseAPI] Supplier failure for order ${orderId}:`, errMsg);

    // Automatic delivery failed, so refund and close the order out. This
    // mirrors the public API path (app/api/v1/logs/[slug]/buy) so a customer is
    // never left charged for something we could not deliver.
    //
    // Deliberately NOT manual_review on success: that status keeps a "Fulfil"
    // action in the admin panel, and fulfilling an order we have already
    // refunded would hand out the account for free. Listings that are genuinely
    // manual-delivery take the isManual branch far above and are unaffected.
    let refunded = false;
    try {
      await creditWallet(walletRow.id, totalAmount, "NGN");
      await logTransaction({
        walletId: walletRow.id,
        type: "refund",
        amount: totalAmount,
        currency: "NGN",
        status: "completed",
        orderId,
        metadata: { reason: "marketplace_purchase_failed", error: errMsg },
      });
      refunded = true;
    } catch (refundErr) {
      // The debit stood but the credit did not — a human has to settle this.
      console.error(
        `[PurchaseAPI] REFUND FAILED for order ${orderId}:`,
        refundErr
      );
    }

    await db
      .update(order)
      .set({
        status: refunded ? "failed" : "manual_review",
        updatedAt: new Date(),
        metadata: {
          ...(body.coupon ? { coupon: body.coupon } : {}),
          error: errMsg,
          refunded,
          ...(refunded ? {} : { pending_fulfillment: true }),
        },
      })
      .where(eq(order.id, orderId));

    // Only queue a delivery record when the refund failed: that is the one case
    // still needing a human. A refunded order has nothing left to deliver, and
    // the admin fulfil route creates this row on demand anyway.
    if (!refunded) {
      await db.insert(accountDelivery).values({
        id: crypto.randomUUID(),
        orderId,
        platform: list.platform,
        deliveryStatus: "pending",
        notes: `Automatic fulfillment failed: ${errMsg} — REFUND ALSO FAILED, customer is still charged.`,
      });
    }

    try {
      const [usr] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
      if (usr?.email) {
        const { sendAdminOrderNotification } = await import("@/lib/email");
        await sendAdminOrderNotification({
          orderId,
          orderType: "marketplace",
          userEmail: usr.email,
          userName: usr.name,
          amount: totalAmount,
          currency: "NGN",
          platform: list.platform,
          status: refunded
            ? "failed — customer refunded automatically"
            : "manual_review — REFUND FAILED, customer still charged",
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json(
      {
        error: refunded
          ? `Automatic delivery failed, so your wallet has been refunded in full. (${errMsg})`
          : `Automatic delivery failed. (${errMsg}) Our team has been notified and will sort your order out.`,
        orderId,
        status: refunded ? "failed" : "manual_review",
        refunded,
      },
      { status: 502 }
    );
  }
}
