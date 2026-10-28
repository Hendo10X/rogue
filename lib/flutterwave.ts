import { and, desc, eq, gte, ne } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { deposit, user } from "@/db/schema";
import { creditWallet, logTransaction } from "@/lib/wallet";
import { rewardReferralForDeposit } from "@/lib/referral";

/**
 * One way to credit a Flutterwave deposit, shared by the webhook, the
 * browser's post-payment check and the pending-deposit sweep:
 * 1. ask Flutterwave itself whether the payment succeeded (never trust a
 *    webhook body or the browser), and for how much;
 * 2. claim the deposit with a single conditional update, so whichever path
 *    gets there first credits it and every other path does nothing.
 */

type FlwTransaction = { id: number; tx_ref: string; amount: number; currency: string; status: string };

const API = "https://api.flutterwave.com/v3";

async function flw(path: string): Promise<FlwTransaction | null> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");
  const res = await fetch(`${API}/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as { status?: string; data?: FlwTransaction } | null;
  return json?.status === "success" && json.data ? json.data : null;
}

/** Looks the payment up by our reference (tx_ref), or by Flutterwave's transaction id. */
export async function verifyFlutterwavePayment(ref: { txRef?: string | null; transactionId?: string | number | null }) {
  if (ref.transactionId) {
    const byId = await flw(`transactions/${encodeURIComponent(String(ref.transactionId))}/verify`);
    if (byId) return byId;
  }
  if (ref.txRef) return flw(`transactions/verify_by_reference?tx_ref=${encodeURIComponent(ref.txRef)}`);
  return null;
}

export type CreditResult =
  | { ok: true; credited: boolean; amountNgn: number }
  | { ok: false; reason: "not_found" | "not_paid" | "mismatch" | "error"; message?: string };

/**
 * Verifies and credits one deposit by its tx_ref. Safe to call any number of
 * times from any path: only the first successful claim credits the wallet.
 * `expectUserId` restricts it to the signed-in customer's own deposit.
 */
export async function creditFlutterwaveDeposit(
  txRef: string,
  opts: { transactionId?: string | number | null; source: string; expectUserId?: string } = { source: "unknown" },
): Promise<CreditResult> {
  const [dep] = await db.select().from(deposit).where(eq(deposit.plisioOrderNumber, txRef)).limit(1);
  if (!dep || dep.provider !== "flutterwave") return { ok: false, reason: "not_found" };
  if (opts.expectUserId && dep.userId !== opts.expectUserId) return { ok: false, reason: "not_found" };
  if (dep.status === "completed") return { ok: true, credited: false, amountNgn: Number(dep.amount) };

  let tx: FlwTransaction | null;
  try {
    tx = await verifyFlutterwavePayment({ txRef, transactionId: opts.transactionId });
  } catch (err) {
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : String(err) };
  }
  if (!tx || tx.status !== "successful") return { ok: false, reason: "not_paid" };
  if (tx.tx_ref !== txRef || tx.currency !== "NGN") {
    console.error("[Flutterwave] reference/currency mismatch", { txRef, got: tx.tx_ref, currency: tx.currency });
    return { ok: false, reason: "mismatch" };
  }

  // Claim it: only one caller ever sees a row come back.
  const [claimed] = await db
    .update(deposit)
    .set({ status: "completed", completedAt: new Date(), plisioTxnId: String(tx.id) })
    .where(and(eq(deposit.id, dep.id), ne(deposit.status, "completed")))
    .returning({ id: deposit.id });
  if (!claimed) return { ok: true, credited: false, amountNgn: Number(dep.amount) };

  const amountNgn = Number(tx.amount);
  await creditWallet(dep.walletId, String(amountNgn), "NGN");
  await rewardReferralForDeposit({ userId: dep.userId, depositId: dep.id, amountNgn });
  await logTransaction({
    walletId: dep.walletId,
    type: "deposit",
    amount: String(amountNgn),
    currency: "NGN",
    status: "completed",
    externalReference: String(tx.id),
    metadata: { flutterwaveTransactionId: tx.id, txRef, depositId: dep.id, verifiedBy: opts.source },
  });
  console.log(`[Flutterwave] credited ${amountNgn} NGN for ${txRef} via ${opts.source}`);

  try {
    const [usr] = await db.select().from(user).where(eq(user.id, dep.userId)).limit(1);
    if (usr?.email) {
      const { sendAdminDepositNotification } = await import("@/lib/email");
      await sendAdminDepositNotification({
        depositId: dep.id,
        provider: "flutterwave",
        userEmail: usr.email,
        userName: usr.name,
        amount: String(amountNgn),
        currency: "NGN",
      });
    }
  } catch {
    /* non-critical */
  }
  return { ok: true, credited: true, amountNgn };
}

/**
 * Safety net for when neither the webhook nor the browser check landed (closed
 * tab, delayed bank transfer, webhook misconfigured): re-checks this
 * customer's pending Flutterwave deposits from the last 2 days. Cheap when
 * there are none; at most 5 lookups per call.
 */
const lastSweep = new Map<string, number>();
const SWEEP_EVERY_MS = 2 * 60 * 1000;

export async function sweepPendingFlutterwave(userId: string): Promise<number> {
  if (!process.env.FLUTTERWAVE_SECRET_KEY) return 0;
  // An abandoned checkout stays "pending": don't ask Flutterwave on every page load.
  const now = Date.now();
  if (now - (lastSweep.get(userId) ?? 0) < SWEEP_EVERY_MS) return 0;
  lastSweep.set(userId, now);
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const pending = await db
    .select({ ref: deposit.plisioOrderNumber })
    .from(deposit)
    .where(
      and(eq(deposit.userId, userId), eq(deposit.provider, "flutterwave"), eq(deposit.status, "pending"), gte(deposit.createdAt, since)),
    )
    .orderBy(desc(deposit.createdAt))
    .limit(5);
  const results = await Promise.all(
    pending.map((p: { ref: string }) => creditFlutterwaveDeposit(p.ref, { source: "sweep", expectUserId: userId }).catch(() => null)),
  );
  return results.filter((r) => r?.ok && r.credited).length;
}
