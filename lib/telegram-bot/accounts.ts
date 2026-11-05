import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { telegramAccount, user } from "@/db/schema";
import { getOrCreateWallet } from "@/lib/wallet";
import { TELEGRAM_EMAIL_DOMAIN } from "@/lib/email";
import { send, shopBotConfigured } from "./api";

export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };
export type BotAccount = typeof telegramAccount.$inferSelect;

/** What the bot is waiting for the customer to type next. */
export type Pending = { kind: "fund_amount" } | { kind: "search" } | { kind: "buying"; at: number } | null;

/**
 * The bot customer's Rogue account, created on first contact: a normal user
 * with a placeholder email plus an NGN wallet, so everything else (wallet,
 * orders, admin) works unchanged.
 */
export async function getOrCreateAccount(from: TgUser, chatId: number): Promise<{ account: BotAccount; isNew: boolean }> {
  const telegramId = String(from.id);
  const [existing] = await db.select().from(telegramAccount).where(eq(telegramAccount.telegramId, telegramId)).limit(1);
  if (existing) {
    if (existing.chatId !== String(chatId) || existing.username !== (from.username ?? null)) {
      await db
        .update(telegramAccount)
        .set({ chatId: String(chatId), username: from.username ?? null, updatedAt: new Date() })
        .where(eq(telegramAccount.telegramId, telegramId));
    }
    return { account: existing, isNew: false };
  }

  const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || `Telegram ${telegramId}`;
  const email = `tg${telegramId}@${TELEGRAM_EMAIL_DOMAIN}`;
  // A previous half-finished signup may have created the user already.
  let [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (!u) {
    u = { id: crypto.randomUUID() };
    await db.insert(user).values({ id: u.id, name, email, emailVerified: false });
  }
  await getOrCreateWallet(u.id, "NGN");
  const [account] = await db
    .insert(telegramAccount)
    .values({ telegramId, userId: u.id, chatId: String(chatId), username: from.username ?? null })
    .onConflictDoNothing()
    .returning();
  if (!account) {
    const [again] = await db.select().from(telegramAccount).where(eq(telegramAccount.telegramId, telegramId)).limit(1);
    return { account: again, isNew: false };
  }
  return { account, isNew: true };
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
