import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import {
  order,
  listing,
  supplier,
  supplierOrder,
  accountDelivery,
  transaction,
  wallet,
  user,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { purchaseFromSupplier } from "@/lib/suppliers/adapter";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret or local development
  const authHeader = req.headers.get("Authorization");
  const isLocal = process.env.NODE_ENV === "development";
  const cronSecret = process.env.CRON_SECRET;

  if (!isLocal && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch up to 5 pending orders to process in one go
  const pendingOrders = await db
    .select()
    .from(order)
    .where(eq(order.status, "pending"))
    .orderBy(asc(order.createdAt))
    .limit(5);

  if (pendingOrders.length === 0) {
    return NextResponse.json({ processed: 0, message: "No pending orders" });
  }

  const results = [];

  for (const ord of pendingOrders) {
    try {
      results.push(await processPendingOrder(ord));
    } catch (err) {
      console.error(`Failed to process order ${ord.id}:`, err);
      results.push({ orderId: ord.id, status: "error", error: String(err) });
    }
  }

  return NextResponse.json({
    processed: pendingOrders.length,
    results,
  });
}

async function processPendingOrder(ord: any) {
  const orderId = ord.id;

  // Mark as processing immediately to avoid double-processing
  await db
    .update(order)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(order.id, orderId));

  const [list] = await db
    .select()
    .from(listing)
    .where(eq(listing.id, ord.listingId))
    .limit(1);

  if (!list) {
    await db.update(order).set({ status: "failed", updatedAt: new Date() }).where(eq(order.id, orderId));
    return { orderId, status: "failed", reason: "listing_not_found" };
  }

  const [sup] = await db
    .select()
    .from(supplier)
    .where(eq(supplier.id, list.supplierId))
    .limit(1);

  if (!sup?.apiUrl || !sup?.apiKey) {
    await db.update(order).set({ status: "failed", updatedAt: new Date() }).where(eq(order.id, orderId));
    return { orderId, status: "failed", reason: "supplier_not_configured" };
  }

  const coupon = (ord.metadata as { coupon?: string })?.coupon;

  try {
    const purchaseResult = await purchaseFromSupplier(
      { baseUrl: sup.apiUrl, apiKey: sup.apiKey },
      list.externalProductId,
      ord.quantity,
      coupon
    );

    if (purchaseResult.status !== "success" || !purchaseResult.trans_id) {
      throw new Error(purchaseResult.msg ?? "Supplier purchase failed");
    }

    // Success flow
    const supplierOrderId = crypto.randomUUID();
    await db.insert(supplierOrder).values({
      id: supplierOrderId,
      orderId,
      supplierId: sup.id,
      externalId: purchaseResult.trans_id,
      status: "completed",
      responsePayload: purchaseResult as unknown as Record<string, unknown>,
    });

    const credentials = purchaseResult.data ?? [];
    const deliveryData = credentials.join("\n");
    const firstLine = credentials[0] || "";
    const parts = firstLine.split(":");

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

    // Handle transaction log if paid via wallet
    if (ord.walletId) {
      await db.insert(transaction).values({
        id: crypto.randomUUID(),
        walletId: ord.walletId,
        type: "order_payment",
        amount: `-${ord.amount}`,
        currency: ord.currency,
        status: "completed",
        orderId,
        externalReference: purchaseResult.trans_id,
      });
    }

    await db.update(listing).set({
      stock: list.stock - ord.quantity,
      updatedAt: new Date(),
    }).where(eq(listing.id, list.id));

    await db.update(order).set({ status: "completed", updatedAt: new Date() }).where(eq(order.id, orderId));

    // Email Notification
    const [usr] = await db.select().from(user).where(eq(user.id, ord.userId)).limit(1);
    if (usr?.email) {
      try {
        const { sendOrderDeliveryEmail } = await import("@/lib/email");
        await sendOrderDeliveryEmail({
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
        });
      } catch (e) {
        console.error("Email failed:", e);
      }
    }

    return { orderId, status: "completed" };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    
    // Recovery flow - Refund if using wallet
    if (ord.walletId) {
      const [w] = await db.select().from(wallet).where(eq(wallet.id, ord.walletId)).limit(1);
      if (w) {
        const current = parseFloat(w.balance);
        const refund = parseFloat(ord.amount);
        await db.update(wallet).set({
          balance: (current + refund).toFixed(8),
          updatedAt: new Date(),
        }).where(eq(wallet.id, ord.walletId));

        await db.insert(transaction).values({
          id: crypto.randomUUID(),
          walletId: ord.walletId,
          type: "refund",
          amount: ord.amount,
          currency: ord.currency,
          status: "completed",
          orderId,
          metadata: { reason: "supplier_purchase_failed", error: errMsg },
        });
      }
    }

    await db.update(order).set({ status: "failed", updatedAt: new Date() }).where(eq(order.id, orderId));
    
    await db.insert(accountDelivery).values({
      id: crypto.randomUUID(),
      orderId,
      platform: list.platform,
      deliveryStatus: "failed",
      notes: errMsg,
    });

    return { orderId, status: "failed", error: errMsg };
  }
}
