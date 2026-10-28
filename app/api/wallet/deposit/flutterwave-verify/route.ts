import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { creditFlutterwaveDeposit } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

// POST { transaction_id, tx_ref } — called by the browser right after the
// Flutterwave checkout. Confirms the payment with Flutterwave and credits once.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { transaction_id?: number | string; tx_ref?: string } | null;
  if (!body?.tx_ref) {
    return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
  }

  const result = await creditFlutterwaveDeposit(body.tx_ref, {
    transactionId: body.transaction_id ?? null,
    source: "client-verify",
    expectUserId: session.user.id,
  });

  if (result.ok) return NextResponse.json({ ok: true, message: result.credited ? "Credited" : "Already credited" });
  if (result.reason === "not_paid") {
    return NextResponse.json(
      { error: "Your payment hasn't been confirmed yet. If you were charged, it will show in your wallet within a few minutes." },
      { status: 400 },
    );
  }
  if (result.reason === "not_found") return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  console.error("[FLW Verify] failed", body.tx_ref, result);
  return NextResponse.json(
    { error: "We couldn't confirm your payment right now. If you were charged, it will show in your wallet within a few minutes." },
    { status: 502 },
  );
}
