import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { boostingOrder, deposit, order, otpOrder, proxyOrder, telegramAccount, transaction, user, wallet } from "@/db/schema";
import { getOrCreateWallet } from "@/lib/wallet";
import { isPlaceholderEmail } from "@/lib/email";
import { esc, send } from "./api";

/**
 * Connecting a website account to the Telegram bot. The bot hands out a
 * one-time code (proves the Telegram side); the customer enters it on the
 * website while logged in (proves the website side). The bot then uses the
 * website account: one wallet and one order history. Anything bought or
 * funded in the bot before connecting moves over with it.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
const CODE_MINUTES = 10;

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** "abcd-efgh " → "ABCDEFGH". */
export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** A fresh code for this Telegram account, valid for 10 minutes. */
export async function createLinkCode(telegramId: string): Promise<{ code: string; minutes: number }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode();
    try {
      await db
        .update(telegramAccount)
        .set({ linkCode: code, linkCodeExpiresAt: new Date(Date.now() + CODE_MINUTES * 60_000), updatedAt: new Date() })
        .where(eq(telegramAccount.telegramId, telegramId));
      return { code, minutes: CODE_MINUTES };
    } catch (err) {
      // Unique clash with another live code: try another.
      if (attempt === 2) throw err;
    }
  }
  throw new Error("unreachable");
}

/** Shows the code as "ABCD-EFGH". */
export const prettyCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export type LinkResult = { ok: true; telegramUsername: string | null } | { ok: false; error: string };

/** Connects the Telegram account holding `code` to the logged-in website user. */
export async function redeemLinkCode(rawCode: string, websiteUserId: string): Promise<LinkResult> {
  const code = normaliseCode(rawCode);
  if (code.length !== 8) return { ok: false, error: "That code doesn't look right. It's 8 letters and numbers, like ABCD-EFGH." };

  const [acc] = await db
    .select()
    .from(telegramAccount)
    .where(and(eq(telegramAccount.linkCode, code), gt(telegramAccount.linkCodeExpiresAt, new Date())))
    .limit(1);
  if (!acc) return { ok: false, error: "That code is wrong or has expired. Get a new one in the bot (🔗 Connect my account)." };

  const [websiteUser] = await db.select({ email: user.email }).from(user).where(eq(user.id, websiteUserId)).limit(1);
  if (!websiteUser || isPlaceholderEmail(websiteUser.email)) return { ok: false, error: "Log in to your website account first." };

  const clearCode = () =>
    db.update(telegramAccount).set({ linkCode: null, linkCodeExpiresAt: null, updatedAt: new Date() }).where(eq(telegramAccount.telegramId, acc.telegramId));

  if (acc.userId === websiteUserId) {
    await clearCode();
    return { ok: true, telegramUsername: acc.username };
  }

  const [other] = await db
    .select({ telegramId: telegramAccount.telegramId })
    .from(telegramAccount)
    .where(eq(telegramAccount.userId, websiteUserId))
    .limit(1);
  if (other) return { ok: false, error: "This website account is already connected to another Telegram account. Disconnect it first." };

  // The usual case: a Telegram account that was never connected. Just connect it.
  if (!acc.userId) {
    await db
      .update(telegramAccount)
      .set({ userId: websiteUserId, linkCode: null, linkCodeExpiresAt: null, pending: null, updatedAt: new Date() })
      .where(eq(telegramAccount.telegramId, acc.telegramId));
    await tellConnected(acc.chatId, websiteUser.email);
    return { ok: true, telegramUsername: acc.username };
  }

  // A bot-made placeholder account from before the bot was members-only: move what's on it over.
  const [oldUser] = await db.select({ email: user.email }).from(user).where(eq(user.id, acc.userId)).limit(1);
  if (oldUser && !isPlaceholderEmail(oldUser.email)) {
    return { ok: false, error: "This Telegram account is already connected to a different website account. Disconnect it there first." };
  }

  const [oldWallet, newWallet] = await Promise.all([getOrCreateWallet(acc.userId, "NGN"), getOrCreateWallet(websiteUserId, "NGN")]);
  const oldUserId = acc.userId;

  // One atomic batch: if any step fails, nothing moves. (Neon's HTTP driver
  // runs a batch as one transaction; drivers without batch use a transaction.)
  const steps = [
    db
      .update(telegramAccount)
      .set({ userId: websiteUserId, linkCode: null, linkCodeExpiresAt: null, pending: null, updatedAt: new Date() })
      .where(eq(telegramAccount.telegramId, acc.telegramId)),
    // Balance first added to the website wallet, then the bot wallet emptied.
    db
      .update(wallet)
      .set({ balance: sql`${wallet.balance} + (SELECT w.balance FROM wallet w WHERE w.id = ${oldWallet.id})` })
      .where(eq(wallet.id, newWallet.id)),
    db.update(wallet).set({ balance: "0" }).where(eq(wallet.id, oldWallet.id)),
    db.update(transaction).set({ walletId: newWallet.id }).where(eq(transaction.walletId, oldWallet.id)),
    // Orders and deposits follow, with their wallet, so refunds and late payments land in the right place.
    db.update(order).set({ userId: websiteUserId, walletId: newWallet.id }).where(eq(order.userId, oldUserId)),
    db.update(boostingOrder).set({ userId: websiteUserId, walletId: newWallet.id }).where(eq(boostingOrder.userId, oldUserId)),
    db.update(otpOrder).set({ userId: websiteUserId, walletId: newWallet.id }).where(eq(otpOrder.userId, oldUserId)),
    db.update(proxyOrder).set({ userId: websiteUserId, walletId: newWallet.id }).where(eq(proxyOrder.userId, oldUserId)),
    db.update(deposit).set({ userId: websiteUserId, walletId: newWallet.id }).where(eq(deposit.userId, oldUserId)),
  ];
  if (typeof db.batch === "function") {
    await db.batch(steps);
  } else {
    await db.transaction(async (tx: { execute: (q: unknown) => Promise<unknown> }) => {
      for (const step of steps) await tx.execute(step.getSQL());
    });
  }

  await tellConnected(acc.chatId, websiteUser.email);
  return { ok: true, telegramUsername: acc.username };
}

function tellConnected(chatId: string, email: string) {
  return send(
    chatId,
    `✅ Connected to your Rogue Socials account <b>${esc(maskEmail(email))}</b>.\n\nYou can now buy OTP numbers and proxies here with your wallet.`,
    [[{ text: "🏠 Open the menu", callback_data: "m" }]],
  );
}

/** The Telegram account connected to a website user, if any. */
export async function linkedTelegram(websiteUserId: string): Promise<{ username: string | null } | null> {
  const [acc] = await db
    .select({ username: telegramAccount.username })
    .from(telegramAccount)
    .where(eq(telegramAccount.userId, websiteUserId))
    .limit(1);
  return acc ?? null;
}

/**
 * Disconnects Telegram from a website account. The wallet and orders stay on
 * the website account; the bot goes back to asking them to connect.
 */
export async function unlinkTelegram(websiteUserId: string): Promise<boolean> {
  const rows = await db
    .update(telegramAccount)
    .set({ userId: null, pending: null, linkCode: null, linkCodeExpiresAt: null, updatedAt: new Date() })
    .where(eq(telegramAccount.userId, websiteUserId))
    .returning({ chatId: telegramAccount.chatId });
  if (rows[0]) {
    await send(rows[0].chatId, "Your Rogue Socials account was disconnected from this bot. Send /start to connect again.");
  }
  return rows.length > 0;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, name.length - 2)))}@${domain}`;
}
