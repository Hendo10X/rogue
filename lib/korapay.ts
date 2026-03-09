import { createHmac } from "crypto";

/**
 * Verify Korapay webhook signature.
 * Per Korapay docs: HMAC SHA256 of JSON.stringify(data) signed with secret key.
 * Do NOT sort keys - use the raw data string as received.
 * Header: x-korapay-signature
 */
export function verifyKorapayWebhook(
  rawDataString: string,
  signature: string | null,
  secretKey: string
): boolean {
  if (!signature || !secretKey?.trim()) return false;
  if (!rawDataString) return false;

  const hash = createHmac("sha256", secretKey.trim())
    .update(rawDataString)
    .digest("hex");

  const isValid = hash === signature;

  if (!isValid) {
    console.error("[Korapay Signature] Mismatch detected", {
      calculated: hash,
      received: signature,
    });
  }

  return isValid;
}
