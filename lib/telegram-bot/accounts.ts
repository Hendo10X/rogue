import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { telegramAccount, user } from "@/db/schema";
import { isPlaceholderEmail } from "@/lib/email";
import { send, shopBotConfigured } from "./api";

export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };
export type BotAccount = typeof telegramAccount.$inferSelect;
/** A Telegram account connected to a Rogue Socials account. */
export type MemberAccount = BotAccount & { userId: string };

/** What the bot is waiting for the customer to type next, or an order being put together. */
export type Pending =
  | { kind: "fund_amount" }
  | { kind: "buying"; at: number }
  | { kind: "otp_search" }
  | { kind: "proxy"; spec: ProxyDraft }
  | null;

/** A proxy order being picked step by step (type → country → period → … → quantity). */
export type ProxyDraft = {
  type: "ipv4" | "isp" | "ipv6" | "mobile";
  country?: string;
  period?: string;
  operator?: string;
  rotation?: number;
  protocol?: "HTTPS" | "SOCKS5";
  quantity?: number;
};

/**
 * The Telegram side of a customer. The bot is members-only: this row exists
 * from the first message (it holds the connect code), but `userId` stays null
 * until they connect their Rogue Socials account. No account is ever created
 * from Telegram. (Bot-made placeholder accounts from before count as not
 * connected; connecting moves anything on them over.)
 */
export async function getOrCreateAccount(from: TgUser, chatId: number): Promise<{ account: BotAccount; isNew: boolean }> {
  const telegramId = String(from.id);
  const [row] = await db
    .select({ account: telegramAccount, email: user.email })
    .from(telegramAccount)
    .leftJoin(user, eq(user.id, telegramAccount.userId))
    .where(eq(telegramAccount.telegramId, telegramId))
    .limit(1);
  if (row) {
    const existing: BotAccount = row.account;
    if (existing.chatId !== String(chatId) || existing.username !== (from.username ?? null)) {
      await db
        .update(telegramAccount)
        .set({ chatId: String(chatId), username: from.username ?? null, updatedAt: new Date() })
        .where(eq(telegramAccount.telegramId, telegramId));
    }
    const placeholder = row.email ? isPlaceholderEmail(row.email) : false;
    return { account: placeholder ? { ...existing, userId: null } : existing, isNew: false };
  }
  const [account] = await db
    .insert(telegramAccount)
    .values({ telegramId, userId: null, chatId: String(chatId), username: from.username ?? null })
    .onConflictDoNothing()
    .returning();
  if (!account) {
    const [again] = await db.select().from(telegramAccount).where(eq(telegramAccount.telegramId, telegramId)).limit(1);
    return { account: again, isNew: false };
  }
  return { account, isNew: true };
}

export function isMember(account: BotAccount): account is MemberAccount {
  return !!account.userId;
}

export async function setPending(telegramId: string, pending: Pending) {
  await db.update(telegramAccount).set({ pending, updatedAt: new Date() }).where(eq(telegramAccount.telegramId, telegramId));
}

/**
 * Claims the customer's one purchase slot. False while another purchase is
 * still running (a double tap, or Telegram re-sending the same tap), so a
 * customer is never charged twice for one tap. A stuck slot frees after 2 minutes.
 */
export async function claimPurchase(telegramId: string): Promise<boolean> {
  const staleBefore = Date.now() - 120_000;
  const rows = await db
    .update(telegramAccount)
    .set({ pending: { kind: "buying", at: Date.now() }, updatedAt: new Date() })
    .where(
      and(
        eq(telegramAccount.telegramId, telegramId),
        sql`(${telegramAccount.pending} IS NULL OR ${telegramAccount.pending} ->> 'kind' <> 'buying' OR (${telegramAccount.pending} ->> 'at')::bigint < ${staleBefore})`,
      ),
    )
    .returning({ id: telegramAccount.telegramId });
  return rows.length > 0;
}

/** Messages a customer through the bot, if they use it. Never throws. */
export async function notifyBotUser(userId: string, text: string): Promise<void> {
  if (!shopBotConfigured()) return;
  try {
    const [acc] = await db
      .select({ chatId: telegramAccount.chatId })
      .from(telegramAccount)
      .where(eq(telegramAccount.userId, userId))
      .limit(1);
    if (acc) await send(acc.chatId, text);
  } catch (err) {
    console.error("[ShopBot] notify failed", err);
  }
}
