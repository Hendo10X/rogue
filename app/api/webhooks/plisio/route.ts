import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { deposit, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPlisioWebhook } from "@/lib/plisio";
import { creditWallet, logTransaction } from "@/lib/wallet";
import { getUSDtoNGNRate } from "@/lib/currency";

export async function POST(req: NextRequest) {
  const apiKey = process.env.PLISIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyPlisioWebhook(payload, apiKey)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 422 });
  }

  const status = payload.status as string;
  const orderNumber = payload.order_number as string;

  if (!orderNumber) {
    return NextResponse.json({ error: "Missing order_number" }, { status: 400 });
  }

  const [dep] = await db
    .select()
    .from(deposit)
    .where(eq(deposit.plisioOrderNumber, orderNumber))
    .limit(1);

  if (!dep) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  if (dep.status === "completed") {
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

  if (status !== "completed") {
    if (["expired", "cancelled", "error"].includes(status)) {
      await db
        .update(deposit)
        .set({
          status: status === "cancelled" ? "cancelled" : "failed",
          completedAt: new Date(),
        })
        .where(eq(deposit.id, dep.id));
    }
    return NextResponse.json({ ok: true });
  }

  const amount =
    (payload.source_amount ?? payload.invoice_sum ?? payload.amount ?? dep.amount) as string;
  
  const rate = await getUSDtoNGNRate();
  const amountNgn = Math.round(parseFloat(amount) * rate);

  await db
    .update(deposit)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(deposit.id, dep.id));

  await creditWallet(dep.walletId, String(amountNgn), "NGN");

  await logTransaction({
    walletId: dep.walletId,
    type: "deposit",
    amount: String(amountNgn),
    currency: "NGN",
    status: "completed",
    externalReference: payload.txn_id as string,
    metadata: {
      plisioTxnId: payload.txn_id,
      depositId: dep.id,
    },
  });

  try {
    const [usr] = await db.select().from(user).where(eq(user.id, dep.userId)).limit(1);
    if (usr?.email) {
      const { sendAdminDepositNotification } = await import("@/lib/email");
      await sendAdminDepositNotification({
        depositId: dep.id,
        provider: "plisio",
        userEmail: usr.email,
        userName: usr.name,
        amount: String(amountNgn),
        currency: "NGN",
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true });
}
