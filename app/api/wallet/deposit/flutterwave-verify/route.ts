import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { deposit, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { creditWallet, logTransaction } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { transaction_id: number; tx_ref: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { transaction_id, tx_ref } = body;
  if (!transaction_id || !tx_ref) {
    return NextResponse.json({ error: "Missing transaction_id or tx_ref" }, { status: 400 });
  }

  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Flutterwave not configured" }, { status: 500 });
  }

  // Verify with Flutterwave
  let flwData: {
    status: string;
    data?: {
      id: number;
      tx_ref: string;
      amount: number;
      currency: string;
      status: string;
      customer?: { email: string };
    };
  };

  try {
    const flwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    flwData = await flwRes.json();
  } catch {
    return NextResponse.json({ error: "Could not reach Flutterwave to verify payment" }, { status: 502 });
  }

  if (flwData.status !== "success" || flwData.data?.status !== "successful") {
    console.error("[FLW Verify] Payment not successful:", flwData);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const flwTxRef = flwData.data.tx_ref;
  const flwAmount = flwData.data.amount;
  const flwCurrency = flwData.data.currency;

  if (flwTxRef !== tx_ref) {
    return NextResponse.json({ error: "Transaction reference mismatch" }, { status: 400 });
  }

  if (flwCurrency !== "NGN") {
    return NextResponse.json({ error: "Unexpected currency" }, { status: 400 });
  }

  // Find the deposit record
  const [dep] = await db
    .select()
    .from(deposit)
    .where(eq(deposit.plisioOrderNumber, tx_ref))
    .limit(1);

  if (!dep) {
    console.error("[FLW Verify] Deposit record not found for tx_ref:", tx_ref);
    return NextResponse.json({ error: "Deposit record not found" }, { status: 404 });
  }

  // Security: ensure this deposit belongs to the logged-in user
  if (dep.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (dep.provider !== "flutterwave") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // Already credited — idempotent response
  if (dep.status === "completed") {
    return NextResponse.json({ ok: true, message: "Already credited" });
  }

  try {
    await db
      .update(deposit)
      .set({
        status: "completed",
        completedAt: new Date(),
        plisioTxnId: String(transaction_id),
      })
      .where(eq(deposit.id, dep.id));

    await creditWallet(dep.walletId, String(flwAmount), "NGN");

    await logTransaction({
      walletId: dep.walletId,
      type: "deposit",
      amount: String(flwAmount),
      currency: "NGN",
      status: "completed",
      externalReference: String(transaction_id),
      metadata: {
        flutterwaveTransactionId: transaction_id,
        txRef: tx_ref,
        depositId: dep.id,
        verifiedBy: "client-verify",
      },
    });

    console.log("[FLW Verify] Wallet credited:", dep.walletId, flwAmount, "NGN");

    // Send admin notification (non-critical)
    try {
      const [usr] = await db.select().from(user).where(eq(user.id, dep.userId)).limit(1);
      if (usr?.email) {
        const { sendAdminDepositNotification } = await import("@/lib/email");
        await sendAdminDepositNotification({
          depositId: dep.id,
          provider: "flutterwave",
          userEmail: usr.email,
          userName: usr.name,
          amount: String(flwAmount),
          currency: "NGN",
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[FLW Verify] Crediting failed:", error);
    return NextResponse.json({ error: "Failed to credit wallet" }, { status: 500 });
  }
}
