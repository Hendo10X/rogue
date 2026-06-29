import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { apiKey } from "@/db/schema";
import { getSetting } from "@/lib/admin-auth";

// Branded prefix. Deliberately NOT "rk_live_"/"sk_live_" so keys don't collide
// with Stripe's key format (which trips secret scanners like GitHub's).
const KEY_PREFIX = "rogue_";

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
    // Stored for display in the dashboard, e.g. "rogue_1a2b3c…"
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

/**
 * API reseller markup (%) added on top of the supplier's raw cost, configured
 * by admin. Because it's a markup over cost (not a discount off the website
 * price), the reseller price is ALWAYS above supplier cost — you can never
 * accidentally sell at a loss. Default 30%.
 */
export async function getApiMarkupPercent(): Promise<number> {
  const val = await getSetting("api_markup_percent");
  const n = val ? parseFloat(val) : NaN;
  if (!Number.isFinite(n) || n < 0) return 30;
  return n;
}

/** Reseller price = supplier cost + markup%. Never below cost. */
export function applyApiMarkup(supplierCost: number, markupPercent: number): number {
  const m = Math.max(0, markupPercent);
  return supplierCost * (1 + m / 100);
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
