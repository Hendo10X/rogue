import { NextRequest, NextResponse } from "next/server";
import { creditFlutterwaveDeposit } from "@/lib/flutterwave";

/**
 * Flutterwave payment webhook. Accepts both webhook formats Flutterwave can
 * be set to send:
 *   v3:     { event: "charge.completed", data: { id, tx_ref, status } }
 *   legacy: { "event.type": "...", id, txRef, status }
 * The body is only used to find the deposit; whether it's paid, and for how
 * much, is always confirmed with Flutterwave's API before crediting.
 */
export async function POST(req: NextRequest) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  const signature = req.headers.get("verif-hash");
  if (secretHash && signature !== secretHash) {
    // Usually means the "Secret hash" in the Flutterwave dashboard doesn't match FLUTTERWAVE_SECRET_HASH.
    console.error("[Flutterwave Webhook] Invalid signature (check FLUTTERWAVE_SECRET_HASH matches the dashboard)");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;
  const txRef = String(data.tx_ref ?? data.txRef ?? "").trim();
  const transactionId = (data.id ?? data.transaction_id ?? null) as string | number | null;
  const status = String(data.status ?? "").toLowerCase();
  console.log("[Flutterwave Webhook] Received", { event: body.event ?? body["event.type"], txRef, status });

  if (!txRef) return NextResponse.json({ ok: true, ignored: "no tx_ref" });
  if (status && status !== "successful") return NextResponse.json({ ok: true, ignored: status });

  const result = await creditFlutterwaveDeposit(txRef, { transactionId, source: "webhook" });
  if (!result.ok) {
    console.error("[Flutterwave Webhook] Not credited", txRef, result);
    // 200 for "not ours"/"not paid" so Flutterwave stops retrying; 500 on our own errors so it retries.
    return NextResponse.json({ ok: false, reason: result.reason }, { status: result.reason === "error" ? 500 : 200 });
  }
  return NextResponse.json({ ok: true, credited: result.credited });
}
