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

    await db.insert(accountDelivery).values({
      id: crypto.randomUUID(),
      orderId,
      platform: list.platform,
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

worker.on("completed", (job) => {
  console.log(`[OrderWorker] Completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[OrderWorker] Failed ${job?.id}:`, err?.message);
});

console.log("[OrderWorker] Started");
