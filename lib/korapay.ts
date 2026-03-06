import { createHmac } from "crypto";

/**
 * Verify Korapay webhook signature.
 * HMAC SHA256 of the stringified `data` object, signed with secret key.
 * Header: x-korapay-signature
 */
export function verifyKorapayWebhook(
  payload: { data?: unknown },
  signature: string | null,
  secretKey: string
): boolean {
  if (!signature || !secretKey?.trim()) return false;
  if (!payload.data) return false;

  const dataStr = JSON.stringify(payload.data);
  const hash = createHmac("sha256", secretKey.trim())
    .update(dataStr)
    .digest("hex");
  return hash === signature;
}
