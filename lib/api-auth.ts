import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { apiKey } from "@/db/schema";
import { getSetting } from "@/lib/admin-auth";

const KEY_PREFIX = "rk_live_";

export interface GeneratedApiKey {
  /** The full secret — shown to the user exactly once. */
  key: string;
  hash: string;
  prefix: string;
}

export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(24).toString("hex"); // 48 hex chars
  const key = `${KEY_PREFIX}${secret}`;
  return {
    key,
    hash: hashApiKey(key),
    // Stored for display in the dashboard, e.g. "rk_live_1a2b3c…"
    prefix: key.slice(0, KEY_PREFIX.length + 6),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

function extractKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const headerKey = req.headers.get("x-api-key");
  return headerKey?.trim() || null;
}

export interface ApiAuthResult {
  userId: string;
  keyId: string;
}

/**
 * Authenticate a request to the public Rogue API using a bearer / X-API-Key.
 * Returns null when no valid, active key is presented.
 */
export async function authenticateApiRequest(
  req: Request,
): Promise<ApiAuthResult | null> {
  const presented = extractKey(req);
  if (!presented || !presented.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(presented);
  const [row] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.keyHash, hash))
    .limit(1);

  if (!row || !row.active) return null;

  // Best-effort last-used timestamp; never block the request on it.
  db.update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.id, row.id))
    .catch(() => {});

  return { userId: row.userId, keyId: row.id };
}

/** Discount (%) applied to API-user orders, configured by admin. 0–100. */
export async function getApiUserDiscountPercent(): Promise<number> {
  const val = await getSetting("api_user_discount_percent");
  const n = val ? parseFloat(val) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/** Apply the API-user discount to a normal price. */
export function applyApiDiscount(price: number, discountPercent: number): number {
  const d = Math.max(0, Math.min(100, discountPercent));
  return price * (1 - d / 100);
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const ApiErrors = {
  unauthorized: () =>
    jsonError("Invalid or missing API key. Pass it as 'Authorization: Bearer <key>'.", 401),
  badRequest: (msg: string) => jsonError(msg, 400),
  notFound: (msg = "Not found") => jsonError(msg, 404),
  server: (msg = "Internal error") => jsonError(msg, 500),
};
