import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { boostingOrder } from "@/db/schema";
import { creditWallet, logTransaction } from "@/lib/wallet";
import { getOrderStatus } from "./provider";

type Row = typeof boostingOrder.$inferSelect;

/** Our status for a supplier status. "partial" and "failed" trigger refunds. */
export function toBoostingStatus(supplierStatus?: string, remains?: string): string {
  const s = (supplierStatus ?? "").toLowerCase();
  if (s.includes("partial")) return "partial";
  if (s.includes("cancel") || s.includes("refund") || s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("completed")) return "completed";
  if (remains?.trim() === "0" && !s) return "completed";
  return "processing";
}

/** Delivered share of an order, 0–100, from the supplier's "remains". */
export function boostingProgress(o: { status: string; quantity: number; remains: string | null }): number {
  if (o.status === "completed") return 100;
  const remains = Number(o.remains);
  if (!o.remains || !Number.isFinite(remains) || o.quantity <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((o.quantity - remains) / o.quantity) * 100)));
}

/**
 * The status a customer sees. A supplier-cancelled order that was refunded
 * reads "failed" (shown as "Failed · refunded"); older failed orders that were
 * never refunded must not claim a refund, so they get their own status.
 */
export function customerBoostingStatus(o: { status: string; externalStatus: string | null }): string {
  if (o.status === "failed" || o.status === "cancelled") return "failed_unrefunded";
  if (o.status === "refunded" && /cancel|refund|fail|error/i.test(o.externalStatus ?? "")) return "failed";
  return o.status;
}

/**
 * Checks the open orders that have waited longest for a check, so failures get
 * refunded and progress stays current even if the customer never opens Orders.
 * Gives up waiting after `waitMs` so a slow supplier can't hold up the caller.
 */
export async function refreshOpenBoostingOrders(limit: number, waitMs = 10_000): Promise<void> {
  const rows = await db
    .select()
    .from(boostingOrder)
    .where(and(inArray(boostingOrder.status, ["pending", "processing"]), isNotNull(boostingOrder.externalOrderId)))
    .orderBy(asc(boostingOrder.updatedAt))
    .limit(limit);
  const work = Promise.allSettled(rows.map((o: Row) => refreshBoostingOrder(o)));
  await Promise.race([work, new Promise((r) => setTimeout(r, waitMs))]);
}

/**
 * Asks the supplier about one open order, saves progress, and refunds when it
 * fails (everything) or ends partial (the undelivered part). The status leaves
 * "pending"/"processing" in the same statement that claims the refund, so a
 * refund can never be paid twice. Returns the updated row.
 */
export async function refreshBoostingOrder(o: Row): Promise<Row> {
  if (!["pending", "processing"].includes(o.status) || o.externalOrderId == null) return o;
  const s = await getOrderStatus(o.provider, Number(o.externalOrderId));
  const status = toBoostingStatus(s.status, s.remains);
  const live = {
    externalStatus: s.status ?? null,
    charge: s.charge != null ? String(s.charge) : null,
    startCount: s.start_count != null ? String(s.start_count) : null,
    remains: s.remains != null ? String(s.remains) : null,
    updatedAt: new Date(),
  };

  const [saved] = await db
    .update(boostingOrder)
    // A fully refunded order is saved as "refunded" (older "failed" orders were
    // never refunded, so admin can still refund those by hand).
    .set({ ...live, status: status === "failed" ? "refunded" : status })
    .where(and(eq(boostingOrder.id, o.id), inArray(boostingOrder.status, ["pending", "processing"])))
    .returning();
  if (!saved) return o; // someone else already moved it on

  if (status === "failed" || status === "partial") {
    const amount = Number(o.amount);
    const remains = Number(s.remains);
    const share = status === "failed" ? 1 : Number.isFinite(remains) && o.quantity > 0 ? Math.min(1, Math.max(0, remains / o.quantity)) : 0;
    const refund = Math.floor(amount * share * 100) / 100;
    if (refund > 0) {
      try {
        await creditWallet(o.walletId, refund.toFixed(2), o.currency);
        await logTransaction({
          walletId: o.walletId,
          type: "refund",
          amount: refund.toFixed(2),
          currency: o.currency,
          status: "completed",
          metadata: { reason: status === "failed" ? "boosting_failed" : "boosting_partial", boostingOrderId: o.id, remains: s.remains },
        });
      } catch (err) {
        console.error("[Boosting] refund failed", o.id, err);
      }
    }
  }
  return saved;
}
