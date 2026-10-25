/**
 * TOTP (RFC 6238) codes computed in the browser with Web Crypto, so a 2FA
 * secret never leaves the customer's device. 6 digits, 30-second steps,
 * HMAC-SHA1 — what Facebook, Instagram, Google and most sites use.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const PERIOD = 30;

/**
 * Pulls a base32 secret out of whatever was pasted: a bare key with spaces,
 * an otpauth:// URI, or a log line like "user|pass|SECRET". Null if none.
 */
export function extractSecret(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const uri = text.match(/secret=([A-Za-z2-7=\s]+)/i);
  const candidates = uri ? [uri[1]] : text.split(/[|:;,\t]+/);
  // The last field that is all base32 and long enough is the key.
  for (const raw of candidates.reverse()) {
    const clean = raw.replace(/[\s=]/g, "").toUpperCase();
    if (clean.length >= 16 && /^[A-Z2-7]+$/.test(clean)) return clean;
  }
  return null;
}

function base32Decode(secret: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of secret) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** The code for `secret` at time `now` (ms). */
export async function totp(secret: string, now = Date.now()): Promise<string> {
  const counter = Math.floor(now / 1000 / PERIOD);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);

  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

/** Seconds left before the current code changes. */
export function secondsLeft(now = Date.now()): number {
  return PERIOD - (Math.floor(now / 1000) % PERIOD);
}

/** True when delivered log text looks like it carries a 2FA key. */
export function mentions2fa(text: string): boolean {
  return /\b2fa\b|two[-\s]?factor|authenticator/i.test(text) || text.split(/\r?\n/).some((l) => extractSecret(l) !== null);
}
