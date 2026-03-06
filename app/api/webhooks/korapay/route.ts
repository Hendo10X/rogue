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

  let payload: { event?: string; data?: { payment_reference?: string; amount?: number; reference?: string; status?: string } };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyKorapayWebhook(payload, signature, secretKey)) {
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
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  if (dep.provider !== "korapay") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (dep.status === "completed") {
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

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

  return NextResponse.json({ ok: true });
}
