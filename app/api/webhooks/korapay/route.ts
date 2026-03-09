import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { deposit } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyKorapayWebhook } from "@/lib/korapay";
import { creditWallet, logTransaction } from "@/lib/wallet";

export async function POST(req: NextRequest) {
  const secretKey = process.env.KORAPAY_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-korapay-signature");
  const rawBody = await req.text();

  let payload: {
    event?: string;
    data?: {
      payment_reference?: string;
      amount?: number;
      reference?: string;
      status?: string;
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[Korapay Webhook] Received:", {
    event: payload.event,
    reference: payload.data?.payment_reference ?? payload.data?.reference,
  });

  const rawDataString = JSON.stringify(payload.data);

  if (!verifyKorapayWebhook(rawDataString, signature, secretKey)) {
    console.error("[Korapay Webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 422 });
  }

  if (payload.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const orderNumber =
    payload.data?.payment_reference ?? payload.data?.reference;

  if (!orderNumber) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const [dep] = await db
    .select()
    .from(deposit)
    .where(eq(deposit.plisioOrderNumber, orderNumber))
    .limit(1);

  if (!dep) {
    console.error("[Korapay Webhook] Deposit not found for ref:", orderNumber);
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  if (dep.provider !== "korapay") {
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
        plisioTxnId: payload.data?.reference ?? undefined,
      })
      .where(eq(deposit.id, dep.id));

    await creditWallet(dep.walletId, String(amountNgn), "NGN");

    await logTransaction({
      walletId: dep.walletId,
      type: "deposit",
      amount: String(amountNgn),
      currency: "NGN",
      status: "completed",
      externalReference: payload.data?.reference,
      metadata: {
        korapayReference: payload.data?.reference,
        depositId: dep.id,
        amountNgn,
      },
    });

    console.log("[Korapay Webhook] Credited wallet", dep.walletId, "with", amountNgn, "NGN");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Korapay Webhook] Processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
