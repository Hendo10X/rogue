import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { deposit, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { creditWallet, logTransaction } from "@/lib/wallet";

export async function POST(req: NextRequest) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

  const signature = req.headers.get("verif-hash");
  if (secretHash && signature !== secretHash) {
    console.error("[Flutterwave Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event?: string;
    data?: {
      id?: number;
      tx_ref?: string;
      flw_ref?: string;
      amount?: number;
      currency?: string;
      status?: string;
    };
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[Flutterwave Webhook] Received:", {
    event: payload.event,
    tx_ref: payload.data?.tx_ref,
    status: payload.data?.status,
  });

  if (payload.event !== "charge.completed" || payload.data?.status !== "successful") {
    return NextResponse.json({ ok: true });
  }

  const orderNumber = payload.data?.tx_ref;
  if (!orderNumber) {
    return NextResponse.json({ error: "Missing tx_ref" }, { status: 400 });
  }

  const [dep] = await db
    .select()
    .from(deposit)
    .where(eq(deposit.plisioOrderNumber, orderNumber))
    .limit(1);

  if (!dep) {
    console.error("[Flutterwave Webhook] Deposit not found for ref:", orderNumber);
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  if (dep.provider !== "flutterwave") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (dep.status === "completed") {
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

  try {
    const amountNgn = payload.data?.amount ?? parseFloat(dep.amount);

    await db
      .update(deposit)
      .set({
        status: "completed",
        completedAt: new Date(),
        plisioTxnId: String(payload.data?.id ?? payload.data?.flw_ref ?? ""),
      })
      .where(eq(deposit.id, dep.id));

    await creditWallet(dep.walletId, String(amountNgn), "NGN");

    await logTransaction({
      walletId: dep.walletId,
      type: "deposit",
      amount: String(amountNgn),
      currency: "NGN",
      status: "completed",
      externalReference: String(payload.data?.id ?? ""),
      metadata: {
        flutterwaveRef: payload.data?.flw_ref,
        txRef: orderNumber,
        depositId: dep.id,
        amountNgn,
      },
    });

    console.log("[Flutterwave Webhook] Credited wallet", dep.walletId, "with", amountNgn, "NGN");

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
    } catch { /* non-critical */ }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Flutterwave Webhook] Processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
