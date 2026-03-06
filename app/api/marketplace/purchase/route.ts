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
import { getOrCreateWallet, debitWallet } from "@/lib/wallet";
import { getMarkupNaira } from "@/lib/admin-auth";
import { getUSDtoNGNRate } from "@/lib/currency";
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

  const [sup] = await db
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

  const [markupNaira, rate] = await Promise.all([
    getMarkupNaira("marketplace"),
    getUSDtoNGNRate(),
  ]);

  const supplierPrice = parseFloat(list.supplierPrice);
  const unitPriceNgn = supplierPrice * rate + markupNaira;
  const totalAmount = (unitPriceNgn * quantity).toFixed(2);

  const walletRow = await getOrCreateWallet(session.user.id, "USDT");
  const totalAmountUsdt = (parseFloat(totalAmount) / rate).toFixed(8);

  const balance = parseFloat(walletRow.balance);

  if (balance < parseFloat(totalAmountUsdt)) {
    return NextResponse.json(
      { error: "Insufficient wallet balance. Fund your wallet first." },
      { status: 400 }
    );
  }

  const orderId = crypto.randomUUID();

  // 1. Debit wallet
  try {
    await debitWallet(walletRow.id, totalAmountUsdt, "USDT");
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
    status: "processing",
    amount: totalAmountUsdt,
    currency: "USDT",
    quantity,
    walletId: walletRow.id,
    metadata: { coupon: body.coupon },
  });

  // 3. Talk to Supplier
  try {
    const purchaseResult = await purchaseFromSupplier(
      { baseUrl: sup.apiUrl, apiKey: sup.apiKey },
      list.externalProductId,
      quantity,
      body.coupon
    );

    if (purchaseResult.status !== "success" || !purchaseResult.trans_id) {
      throw new Error(purchaseResult.msg ?? "Supplier purchase failed");
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
      amount: `-${totalAmountUsdt}`,
      currency: "USDT",
      status: "completed",
      orderId,
      externalReference: purchaseResult.trans_id,
    });

    await db.update(listing).set({
      stock: list.stock - quantity,
      updatedAt: new Date(),
    }).where(eq(listing.id, list.id));

    await db.update(order).set({ status: "completed", updatedAt: new Date() }).where(eq(order.id, orderId));

    // Email Delivery
    const [usr] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
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

    // Update order to manual_review status instead of failing it entirely
    // This allows the admin to fulfill it manually or refund it later.
    await db.update(order).set({ 
      status: "manual_review", 
      updatedAt: new Date(),
      metadata: { 
        ...((body.coupon ? { coupon: body.coupon } : {})),
        error: errMsg,
        pending_fulfillment: true 
      }
    }).where(eq(order.id, orderId));
    
    await db.insert(accountDelivery).values({
      id: crypto.randomUUID(),
      orderId,
      platform: list.platform,
      deliveryStatus: "pending", // Set to pending for manual check
      notes: `Automatic fulfillment failed: ${errMsg}`,
    });

    return NextResponse.json({
      message: "Order placed, but there was a slight delay in processing. Our team is fulfilling it manually now.",
      orderId,
      status: "manual_review",
    });
  }
}
