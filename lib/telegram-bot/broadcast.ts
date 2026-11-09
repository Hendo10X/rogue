import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { telegramAccount } from "@/db/schema";
import { getSetting, setSetting } from "@/lib/admin-auth";
import { send, type Keyboard } from "./api";
import { renderText } from "./settings";

/**
 * Announcements from Admin → Telegram bot to every member (e.g. "OTP numbers
 * are now cheaper"). Sent in batches of 25, about 25 messages a second (under
 * Telegram's limit): the admin page asks for one batch at a time and shows
 * progress, so no long-running job or cron is needed. If the page is closed
 * midway, "Continue" picks up where it stopped.
 */

export type Broadcast = {
  id: string;
  text: string;
  button?: { text: string; url: string } | null;
  status: "sending" | "done" | "cancelled";
  total: number;
  sent: number;
  failed: number;
  /** Last telegram_id sent to (members are walked in id order). */
  cursor: string;
  startedAt: string;
  finishedAt?: string;
};

const CURRENT = "bot_broadcast";
const HISTORY = "bot_broadcast_history";
const BATCH = 25;

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getSetting(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Members are Telegram accounts connected to a website account. */
const isMember = isNotNull(telegramAccount.userId);

export async function memberCount(): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(telegramAccount).where(isMember);
  return r?.n ?? 0;
}

export async function currentBroadcast(): Promise<Broadcast | null> {
  return read<Broadcast | null>(CURRENT, null);
}

export async function broadcastHistory(): Promise<Broadcast[]> {
  return read<Broadcast[]>(HISTORY, []);
}

function keyboard(b: Broadcast["button"]): Keyboard | undefined {
  return b ? [[{ text: b.text, url: b.url }]] : undefined;
}

export function validButton(text?: string, url?: string): Broadcast["button"] | "invalid" {
  const t = text?.trim();
  const u = url?.trim();
  if (!t && !u) return null;
  if (!t || !u || t.length > 40 || !/^https:\/\/\S+$/i.test(u)) return "invalid";
  return { text: t, url: u };
}

export async function startBroadcast(text: string, button: Broadcast["button"]): Promise<Broadcast> {
  const cur = await currentBroadcast();
  if (cur?.status === "sending") throw new Error("Another announcement is still sending. Finish or cancel it first.");
  const b: Broadcast = {
    id: crypto.randomUUID(),
    text,
    button,
    status: "sending",
    total: await memberCount(),
    sent: 0,
    failed: 0,
    cursor: "",
    startedAt: new Date().toISOString(),
  };
  await setSetting(CURRENT, JSON.stringify(b));
  return b;
}

async function finish(b: Broadcast, status: "done" | "cancelled") {
  const done: Broadcast = { ...b, status, finishedAt: new Date().toISOString() };
  const history = await broadcastHistory();
  await Promise.all([
    setSetting(CURRENT, JSON.stringify(done)),
    setSetting(HISTORY, JSON.stringify([done, ...history.filter((h) => h.id !== b.id)].slice(0, 20))),
  ]);
  return done;
}

/** Sends the next batch of an announcement; call until status isn't "sending". */
export async function sendNextBatch(id: string): Promise<Broadcast> {
  const b = await currentBroadcast();
  if (!b || b.id !== id) throw new Error("That announcement isn't running.");
  if (b.status !== "sending") return b;

  const rows: { telegramId: string; chatId: string }[] = await db
    .select({ telegramId: telegramAccount.telegramId, chatId: telegramAccount.chatId })
    .from(telegramAccount)
    .where(b.cursor ? and(isMember, gt(telegramAccount.telegramId, b.cursor)) : isMember)
    .orderBy(asc(telegramAccount.telegramId))
    .limit(BATCH);

  const text = renderText(b.text);
  for (const r of rows) {
    // A member who blocked the bot fails; the rest carry on.
    const ok = await send(r.chatId, text, keyboard(b.button));
    if (ok) b.sent++;
    else b.failed++;
    b.cursor = r.telegramId;
    await new Promise((res) => setTimeout(res, 40));
  }
  if (rows.length < BATCH) return finish(b, "done");
  await setSetting(CURRENT, JSON.stringify(b));
  return b;
}

export async function cancelBroadcast(id: string): Promise<Broadcast | null> {
  const b = await currentBroadcast();
  if (!b || b.id !== id || b.status !== "sending") return b;
  return finish(b, "cancelled");
}

/** Sends the announcement to one member by @username, to check how it looks. */
export async function sendTest(text: string, button: Broadcast["button"], username: string): Promise<boolean> {
  const name = username.trim().replace(/^@/, "");
  if (!name) return false;
  const [acc] = await db
    .select({ chatId: telegramAccount.chatId })
    .from(telegramAccount)
    .where(and(isMember, eq(sql`lower(${telegramAccount.username})`, name.toLowerCase())))
    .limit(1);
  if (!acc) return false;
  return !!(await send(acc.chatId, renderText(text), keyboard(button)));
}
