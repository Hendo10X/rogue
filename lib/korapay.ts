import { createHmac } from "crypto";

/**
 * Verify Korapay webhook signature.
 * HMAC SHA256 of the stringified `data` object, signed with secret key.
 * Header: x-korapay-signature
 */
export function verifyKorapayWebhook(
  payload: { data?: any },
  signature: string | null,
  secretKey: string
): boolean {
  if (!signature || !secretKey?.trim()) return false;
  if (!payload.data) return false;

  // Sort keys alphabetically to ensure deterministic stringification
  // This is a common requirement for webhook signature verification
  const sortObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);
    return Object.keys(obj)
      .sort()
      .reduce((result: any, key) => {
        result[key] = sortObject(obj[key]);
        return result;
      }, {});
  };

  const sortedData = sortObject(payload.data);
  const dataStr = JSON.stringify(sortedData);
  
  const hash = createHmac("sha256", secretKey.trim())
    .update(dataStr)
    .digest("hex");

  const isValid = hash === signature;

  if (!isValid) {
    console.error("[Korapay Signature] Mismatch detected", {
      calculated: hash,
      received: signature,
      sortedDataString: dataStr
    });
  }

  return isValid;
}
