import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { getOrCreateWallet } from "@/lib/wallet";
import { createPlisioInvoice } from "@/lib/plisio";
import { db } from "@/db/drizzle";
import { deposit } from "@/db/schema";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { amount: number; currency?: string; provider?: "plisio" | "korapay" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const provider = body.provider ?? "plisio";
  const amount = Number(body.amount);
  const maxAmount = provider === "korapay" ? 10000000 : 100000;

  if (!Number.isFinite(amount) || amount < 1 || amount > maxAmount) {
    return NextResponse.json(
      { error: `Amount must be between 1 and ${maxAmount}` },
      { status: 400 }
    );
  }

  const currency = body.currency ?? "NGN";
  const wallet = await getOrCreateWallet(session.user.id, currency);

  const depositId = crypto.randomUUID();
  const orderNumber = `dep_${depositId.replace(/-/g, "")}`;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  if (provider === "korapay") {
    const publicKey = process.env.KORAPAY_PUBLIC_KEY;
    if (!publicKey) {
      return NextResponse.json(
        { error: "Korapay payment provider not configured" },
        { status: 500 }
      );
    }

    const usdToNgn = Number(process.env.NEXT_PUBLIC_USD_TO_NGN) || 1300;
    // For Korapay, the user provides the amount in NGN
    const amountNgn = Math.round(amount);
    const amountUsd = amountNgn / usdToNgn;

    await db.insert(deposit).values({
      id: depositId,
      userId: session.user.id,
      walletId: wallet.id,
      amount: amountNgn.toString(),
      currency: "NGN",
      provider: "korapay",
      plisioOrderNumber: orderNumber,
      status: "pending",
    });

    return NextResponse.json({
      provider: "korapay",
      depositId,
      orderNumber,
      amountUsd: amountUsd,
      amount: amountNgn,
      currency: "NGN",
      publicKey,
      customer: {
        name: session.user.name ?? "Customer",
        email: session.user.email ?? "",
      },
      notificationUrl: `${baseUrl}/api/webhooks/korapay`,
    });
  }

  // Plisio
  const apiKey = process.env.PLISIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Plisio payment provider not configured" },
      { status: 500 }
    );
  }

  const callbackUrl = `${baseUrl}/api/webhooks/plisio?json=true`;
  const successUrl = `${baseUrl}/wallet/deposit/success`;

  const result = await createPlisioInvoice(apiKey, {
    orderNumber,
    orderName: `Wallet deposit ${currency}`,
    sourceCurrency: "USD",
    sourceAmount: amount,
    currency,
    callbackUrl,
    successCallbackUrl: `${successUrl}?order=${orderNumber}&status=ok&json=true`,
    email: session.user.email ?? undefined,
  });

  if (result.status !== "success" || !result.data) {
    return NextResponse.json(
      {
        error: result.error?.message ?? "Failed to create payment invoice",
      },
      { status: 400 }
    );
  }

  await db.insert(deposit).values({
    id: depositId,
    userId: session.user.id,
    walletId: wallet.id,
    amount: amount.toString(),
    currency,
    provider: "plisio",
    plisioTxnId: result.data.txn_id,
    plisioOrderNumber: orderNumber,
    status: "pending",
    invoiceUrl: result.data.invoice_url,
  });

  return NextResponse.json({
    provider: "plisio",
    depositId,
    invoiceUrl: result.data.invoice_url,
    orderNumber,
    amount,
    currency,
  });
}
