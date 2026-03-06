import "dotenv/config";
import { Worker } from "bullmq";
import { getRedis } from "../lib/queue/redis";
import { ORDER_QUEUE_NAME } from "../lib/queue/order-queue";
import { db } from "../db/drizzle";
import {
  order,
  listing,
  supplier,
  supplierOrder,
  accountDelivery,
  transaction,
  wallet,
  user,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { purchaseFromSupplier } from "../lib/suppliers/adapter";

interface OrderJobData {
  orderId: string;
}

async function processOrder(orderId: string) {
  const [ord] = await db
    .select()
    .from(order)
    .where(eq(order.id, orderId))
    .limit(1);

  if (!ord || ord.status !== "pending") {
    return;
  }

  await db
    .update(order)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(order.id, orderId));

  const [list] = await db
    .select()
    .from(listing)
    .where(eq(listing.id, ord.listingId))
    .limit(1);

  const [sup] = await db
    .select()
    .from(supplier)
    .where(eq(supplier.id, list!.supplierId))
    .limit(1);

  if (!list || !sup?.apiUrl || !sup?.apiKey) {
    await db
      .update(order)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(order.id, orderId));
    return;
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

    // Standard format: username:password:email:emailpassword
    // We'll try to parse the first one for individual fields
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

    await db
      .update(listing)
      .set({
        stock: list.stock - ord.quantity,
        updatedAt: new Date(),
      })
      .where(eq(listing.id, list.id));

    await db
      .update(order)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(order.id, orderId));

    // Trigger Email Delivery
    const [usr] = await db.select().from(user).where(eq(user.id, ord.userId)).limit(1);
    if (usr?.email) {
      try {
        const { sendOrderDeliveryEmail } = await import("../lib/email");
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
      } catch (emailErr) {
        console.error("Order completion email failed:", emailErr);
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const supplierOrderId = crypto.randomUUID();
    await db.insert(supplierOrder).values({
      id: supplierOrderId,
      orderId,
      supplierId: sup.id,
      status: "failed",
      errorMessage: errMsg,
    });

    if (ord.walletId) {
      const [w] = await db
        .select()
        .from(wallet)
        .where(eq(wallet.id, ord.walletId))
        .limit(1);
      if (w) {
        const current = parseFloat(w.balance);
        const refund = parseFloat(ord.amount);
        await db
          .update(wallet)
          .set({
            balance: (current + refund).toFixed(8),
            updatedAt: new Date(),
          })
          .where(eq(wallet.id, ord.walletId));

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

    await db
      .update(order)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(order.id, orderId));

    await db.insert(accountDelivery).values({
      id: crypto.randomUUID(),
      orderId,
      platform: list.platform,
      deliveryStatus: "failed",
      notes: errMsg,
    });
  }
}

const worker = new Worker<OrderJobData>(
  ORDER_QUEUE_NAME,
  async (job) => {
    await processOrder(job.data.orderId);
  },
  {
    connection: getRedis(),
    concurrency: 3,
  }
);

worker.on("failed", (_job, err) => {
  if (err instanceof Error) {
    process.stderr.write(`[OrderWorker] Job failed: ${err.message}\n`);
  }
});
