import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { getOrCreateWallet } from "@/lib/wallet";
import { createPlisioInvoice } from "@/lib/plisio";
import { db } from "@/db/drizzle";
import { deposit } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.PLISIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Payment provider not configured" },
      { status: 500 }
    );
  }

  let body: { amount: number; currency?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return NextResponse.json(
      { error: "Amount must be between 1 and 100000" },
      { status: 400 }
    );
  }

  const currency = body.currency ?? "USDT";
  const wallet = await getOrCreateWallet(session.user.id, currency);

  const depositId = crypto.randomUUID();
  const orderNumber = `dep_${depositId.replace(/-/g, "")}`;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
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
    plisioTxnId: result.data.txn_id,
    plisioOrderNumber: orderNumber,
    status: "pending",
    invoiceUrl: result.data.invoice_url,
  });

  return NextResponse.json({
    depositId,
    invoiceUrl: result.data.invoice_url,
    orderNumber,
    amount,
    currency,
  });
}
