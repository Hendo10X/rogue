import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { otpOrder } from "@/db/schema";
import { creditWallet, logTransaction } from "@/lib/wallet";
import { cancelNumber, checkNumber, finishNumber } from "./provider";
import { appLabel } from "./labels";

export type OtpOrderRow = typeof otpOrder.$inferSelect;

/** How long a number waits for its SMS before we cancel and refund it. */
export const OTP_WAIT_MINUTES = 20;

/** 5sim states where the number is closed without a code (5sim refunds us). */
const CLOSED_WITHOUT_CODE = new Set(["CANCELED", "TIMEOUT", "BANNED"]);

/**
 * Cancels a waiting number with 5sim and refunds the wallet. The status
 * flips from "waiting" in the same statement that claims the row, so a
 * double click or two tabs can never refund twice. Returns false when 5sim
 * refuses (e.g. too early, or a code already arrived) or the order isn't
 * waiting any more. `alreadyClosed` skips the cancel call when 5sim has
 * closed the number itself.
 */
export async function cancelAndRefund(
  row: OtpOrderRow,
  reason: string,
  alreadyClosed = false,
): Promise<{ ok: boolean; message?: string }> {
  if (row.status !== "waiting") return { ok: false, message: "This number has already finished." };
  if (row.providerNumberId && !alreadyClosed) {
    try {
      await cancelNumber(row.providerNumberId);
    } catch (err) {
      // It may have closed on 5sim's side in the meantime; only then refund.
      const state = await checkNumber(row.providerNumberId).catch(() => null);
      if (!state || !CLOSED_WITHOUT_CODE.has(state.status)) {
        return { ok: false, message: err instanceof Error ? err.message : "Couldn't cancel this number yet." };
      }
    }
  }
  const [claimed] = await db
    .update(otpOrder)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(otpOrder.id, row.id), eq(otpOrder.status, "waiting")))
    .returning({ id: otpOrder.id });
  if (!claimed) return { ok: false, message: "This number has already finished." };

  if (row.walletId) {
    try {
      await creditWallet(row.walletId, row.amount, "NGN");
      await logTransaction({
        walletId: row.walletId,
        type: "refund",
        amount: row.amount,
        currency: "NGN",
        metadata: { reason, otpOrderId: row.id },
      });
    } catch (err) {
      console.error("[OTP] refund failed", row.id, err);
    }
  }
  Object.assign(row, { status: "cancelled" });
  return { ok: true };
}

/** Asks 5sim about one waiting order; saves the code when it arrives. */
async function refresh(row: OtpOrderRow) {
  if (row.status !== "waiting" || !row.providerNumberId) return;
  const got = await checkNumber(row.providerNumberId);
  if (got.sms || got.code) {
    await db
      .update(otpOrder)
      .set({ status: "received", code: got.code, sms: got.sms, updatedAt: new Date() })
      .where(and(eq(otpOrder.id, row.id), eq(otpOrder.status, "waiting")));
    Object.assign(row, { status: "received", code: got.code, sms: got.sms });
    void finishNumber(row.providerNumberId);
    return;
  }
  if (CLOSED_WITHOUT_CODE.has(got.status)) {
    await cancelAndRefund(row, `otp_${got.status.toLowerCase()}`, true);
    return;
  }
  const ageMinutes = (Date.now() - new Date(row.createdAt).getTime()) / 60_000;
  if (ageMinutes > OTP_WAIT_MINUTES) await cancelAndRefund(row, "otp_no_sms_timeout");
}

/** A customer's numbers, newest first, with waiting ones checked for their SMS. */
export async function getOtpOrders(userId: string): Promise<OtpOrderRow[]> {
  let rows: OtpOrderRow[];
  try {
    rows = await db.select().from(otpOrder).where(eq(otpOrder.userId, userId)).orderBy(desc(otpOrder.createdAt)).limit(50);
  } catch {
    return []; // Before migration 0013.
  }
  await Promise.all(
    rows.map((r) =>
      refresh(r).catch((err) => {
        console.error("[OTP] refresh failed", r.id, err);
      }),
    ),
  );
  return rows;
}

/** An OTP number in the shape the Orders page lists. */
export function toOtpOrderListItem(o: OtpOrderRow) {
  return {
    id: o.id,
    type: "otp" as const,
    status: o.status === "received" ? "completed" : o.status === "waiting" ? "processing" : o.status,
    amount: o.amount,
    currency: "NGN",
    quantity: 1,
    createdAt: o.createdAt,
    title: `OTP number · ${appLabel(o.app)} · ${appLabel(o.country)}`,
    platform: "OTP numbers",
    slug: "",
    supplierName: "OTP numbers",
    deliveryStatus: o.status === "received" ? "delivered" : "pending",
    credentials: [o.number ? `Number: ${o.number}` : null, o.code ? `Code: ${o.code}` : null].filter((x): x is string => !!x),
  };
}
