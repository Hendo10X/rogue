import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/email";
import { forwardSupportEmail } from "@/lib/support-forward";

export const dynamic = "force-dynamic";
// Attachments are downloaded and re-sent.
export const maxDuration = 60;

/**
 * Resend webhook (event: email.received): forwards support emails to the
 * owner's Gmail (lib/support-forward.ts). Signed by Resend (Svix headers);
 * the secret is RESEND_WEBHOOK_SECRET from the webhook's page in Resend.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  // The raw body: re-serialising it would break the signature.
  const payload = await req.text();
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const resend = getResend();
  let event: ReturnType<typeof resend.webhooks.verify>;
  try {
    event = resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret: secret });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (event.type !== "email.received") return NextResponse.json({ ok: true, ignored: event.type });

  const result = await forwardSupportEmail(resend, event.data.email_id);
  if (!result.forwarded && result.reason === "send_failed") {
    console.error("[Support] forward failed", event.data.email_id, result.detail);
    // 500 so Resend retries the webhook later.
    return NextResponse.json({ error: "Forward failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...result });
}
