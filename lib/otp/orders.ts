import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { otpOrder } from "@/db/schema";
import { creditWallet, logTransaction } from "@/lib/wallet";
import { cancelNumber, readSms } from "./provider";

export type OtpOrderRow = typeof otpOrder.$inferSelect;

/** How long a number waits for its SMS before we cancel and refund it. */
export const OTP_WAIT_MINUTES = 20;

/**
 * Cancels a waiting number with otpking and refunds the wallet. The status
 * flips from "waiting" in the same statement that claims the row, so a
 * double click or two tabs can never refund twice. Returns false when
 * otpking refuses (e.g. too early) or the order isn't waiting any more.
 */
export async function cancelAndRefund(row: OtpOrderRow, reason: string): Promise<{ ok: boolean; message?: string }> {
  if (row.status !== "waiting") return { ok: false, message: "This number has already finished." };
  if (row.providerNumberId) {
    try {
      await cancelNumber(row.providerNumberId);
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Couldn't cancel this number yet." };
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

/** Asks otpking for the SMS of one waiting order; saves it when it arrives. */
async function refresh(row: OtpOrderRow) {
  if (row.status !== "waiting" || !row.number) return;
  const got = await readSms(row.country, row.app, row.number);
  if (got) {
    await db
      .update(otpOrder)
      .set({ status: "received", code: got.code, sms: got.sms, updatedAt: new Date() })
      .where(and(eq(otpOrder.id, row.id), eq(otpOrder.status, "waiting")));
    Object.assign(row, { status: "received", code: got.code, sms: got.sms });
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
