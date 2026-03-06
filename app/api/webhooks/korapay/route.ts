import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { deposit, webhookLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyKorapayWebhook } from "@/lib/korapay";
import { creditWallet, logTransaction } from "@/lib/wallet";

export async function POST(req: NextRequest) {
  const secretKey = process.env.KORAPAY_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-korapay-signature");

  let payload: { 
    event?: string; 
    data?: { 
      payment_reference?: string; 
      amount?: number; 
      reference?: string; 
      status?: string;
    } 
  };

  const rawBody = await req.text();
  
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Create a log entry for every incoming webhook
  const logId = crypto.randomUUID();
  try {
    // We use "supplier-korapay" as a virtual supplier ID for logging
    await db.insert(webhookLog).values({
      id: logId,
      supplierId: "supplier-korapay", // Virtual ID for tracking
      eventType: payload.event || "unknown",
      payload: payload as any,
      status: "pending",
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("[Korapay Webhook] Failed to create initial log:", e);
  }

  if (!verifyKorapayWebhook(payload, signature, secretKey)) {
    console.error("[Korapay Webhook] Signature verification failed", { 
      received: signature,
      expected: "Calculated in lib/korapay.ts"
    });
    
    await db.update(webhookLog)
      .set({ 
        status: "failed", 
        errorMessage: "Invalid signature" 
      })
      .where(eq(webhookLog.id, logId));

    return NextResponse.json({ error: "Invalid signature" }, { status: 422 });
  }

  if (payload.event !== "charge.success") {
    await db.update(webhookLog)
      .set({ status: "ignored", errorMessage: `Event ${payload.event} ignored` })
      .where(eq(webhookLog.id, logId));
    return NextResponse.json({ ok: true });
  }

  const orderNumber =
    payload.data?.payment_reference ?? payload.data?.reference;
    
  if (!orderNumber) {
    await db.update(webhookLog)
      .set({ status: "failed", errorMessage: "Missing reference" })
      .where(eq(webhookLog.id, logId));
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const [dep] = await db
    .select()
    .from(deposit)
    .where(eq(deposit.plisioOrderNumber, orderNumber))
    .limit(1);

  if (!dep) {
    await db.update(webhookLog)
      .set({ status: "failed", errorMessage: `Deposit not found for ref: ${orderNumber}` })
      .where(eq(webhookLog.id, logId));
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  if (dep.provider !== "korapay") {
    await db.update(webhookLog)
      .set({ status: "failed", errorMessage: "Invalid provider for this deposit" })
      .where(eq(webhookLog.id, logId));
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (dep.status === "completed") {
    await db.update(webhookLog)
      .set({ status: "completed", errorMessage: "Already processed" })
      .where(eq(webhookLog.id, logId));
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

  try {
    const amountNgn =
      payload.data?.amount ?? parseFloat(dep.amount);
    const usdToNgn = Number(process.env.NEXT_PUBLIC_USD_TO_NGN) || 1300;
    const amountUsd = (amountNgn / usdToNgn).toFixed(8);

    await db
      .update(deposit)
      .set({
        status: "completed",
        completedAt: new Date(),
        plisioTxnId: payload.data?.reference ?? undefined,
      })
      .where(eq(deposit.id, dep.id));

    await creditWallet(dep.walletId, amountUsd, "USDT");

    await logTransaction({
      walletId: dep.walletId,
      type: "deposit",
      amount: amountUsd,
      currency: "USDT",
      status: "completed",
      externalReference: payload.data?.reference,
      metadata: {
        korapayReference: payload.data?.reference,
        depositId: dep.id,
        amountNgn,
      },
    });

    await db.update(webhookLog)
      .set({ status: "processed" })
      .where(eq(webhookLog.id, logId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Processing failed";
    await db.update(webhookLog)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(webhookLog.id, logId));
    throw error;
  }
}
