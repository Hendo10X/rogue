import { db } from "@/db/drizzle";
import { listing } from "@/db/schema";
import { after } from "next/server";
import { eq, sql } from "drizzle-orm";
import { describeShape, parseFormatHint, type LogFormat } from "@/lib/log-fields";

/**
 * AI log arrangement: learns how a listing's logs are laid out (which field is
 * the password, the 2FA key, the cookie…) once per listing, and saves it on
 * `listing.metadata.logFormat`. Every delivery of that listing then shows
 * labelled fields with no further AI calls.
 *
 * Only the *shape* of each field is sent (length, character types, email
 * domain), never a login, password or cookie. Needs ANTHROPIC_API_KEY; without
 * it the description hint and the built-in rules are used.
 */

const MODEL = "claude-haiku-5-5";
const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const ALLOWED = [
  "Username", "UID", "Password", "Email", "Email password", "Recovery email",
  "2FA", "Cookie", "Token", "Phone", "Date", "Link", "Extra",
];

type Meta = Record<string, unknown> & { logFormat?: LogFormat; logFormatTriedAt?: string };

export function aiLogFormatEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function askClaude(description: string, shapes: string[][]): Promise<string[] | null> {
  const fieldCount = shapes[0].length;
  const samples = shapes
    .map((s, i) => `Line ${i + 1}:\n${s.map((d, j) => `  field ${j + 1}: ${d}`).join("\n")}`)
    .join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system:
        "You label the fields of social-media account logs sold on a marketplace. Each log is one line split by a delimiter. " +
        "You only see each field's shape, never its value. Usual order: login (username/UID/email), password, email, email password, recovery email, then extras such as 2FA secret, cookie, token. " +
        "A password can contain @ and look like an email; a field right after the login is usually the password. " +
        `Use these labels: ${ALLOWED.join(", ")}. If the listing description names a field none of these fit, use a short label (max 3 words) from it. ` +
        'Reply with JSON only: {"labels": ["...", ...]} with exactly one label per field.',
      messages: [
        {
          role: "user",
          content: `Listing description:\n${description.slice(0, 1500) || "(none)"}\n\nEach line has ${fieldCount} fields.\n${samples}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as { labels?: unknown };
  const labels = Array.isArray(parsed.labels) ? parsed.labels : null;
  if (!labels || labels.length !== fieldCount) return null;
  if (!labels.every((l) => typeof l === "string" && l.trim().length > 0 && l.length <= 24)) return null;
  return labels.map((l) => (l as string).trim());
}

/**
 * Learns the format after the response is sent, so a purchase never waits on
 * the AI. Never throws: outside a request (scripts, tests) it just runs in the
 * background, because this is called after the customer has been charged.
 */
export function learnLogFormatLater(listingId: string, lines: string[]): void {
  if (!lines.length || !aiLogFormatEnabled()) return;
  try {
    after(() => learnLogFormat(listingId, lines));
  } catch {
    void learnLogFormat(listingId, lines);
  }
}

/**
 * Learns and saves a listing's log format from a few delivered lines, unless
 * it already has one (learned or from its description). Never throws: a
 * delivery must not fail because of this.
 */
export async function learnLogFormat(listingId: string, lines: string[]): Promise<void> {
  if (!aiLogFormatEnabled()) return;
  try {
    const [row] = await db
      .select({ metadata: listing.metadata, description: listing.description })
      .from(listing)
      .where(eq(listing.id, listingId))
      .limit(1);
    if (!row) return;
    const meta = (row.metadata as Meta | null) ?? {};
    if (meta.logFormat || parseFormatHint(row.description)) return;
    if (meta.logFormatTriedAt && Date.now() - Date.parse(meta.logFormatTriedAt) < RETRY_AFTER_MS) return;

    const shapes = lines
      .slice(0, 3)
      .map((l) => describeShape(l))
      .filter((s): s is string[] => !!s && s.length >= 2);
    if (shapes.length === 0 || shapes.some((s) => s.length !== shapes[0].length)) return;

    // Two fields are login + password; the rules already get that right.
    if (shapes[0].length === 2) return;
    const labels = await askClaude(row.description ?? "", shapes).catch((e) => {
      console.error("[log-format-ai] request failed", e);
      return null;
    });

    const delimiter = lines[0].includes("|") ? "|" : lines[0].includes("\t") ? "\t" : ":";
    const patch = labels ? { logFormat: { labels, delimiter } } : { logFormatTriedAt: new Date().toISOString() };
    // Merge, so a supplier sync or admin edit running at the same time isn't lost.
    await db
      .update(listing)
      .set({ metadata: sql`coalesce(${listing.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb` })
      .where(eq(listing.id, listingId));
  } catch (e) {
    console.error("[log-format-ai] learn failed", e);
  }
}
