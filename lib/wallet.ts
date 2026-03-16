import { eq, and } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { wallet, transaction } from "@/db/schema";

const DEFAULT_CURRENCY = "NGN";

function generateId() {
  return crypto.randomUUID();
}

export async function creditWallet(
  walletId: string,
  amount: string,
  currency: string
) {
  const [w] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.id, walletId))
    .limit(1);
  if (!w) throw new Error("Wallet not found");

  const current = parseFloat(w.balance);
  const add = parseFloat(amount);
  const newBalance = (current + add).toFixed(8);

  await db
    .update(wallet)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(wallet.id, walletId));

  return newBalance;
}

export async function debitWallet(
  walletId: string,
  amount: string,
  currency: string
): Promise<string> {
  const [w] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.id, walletId))
    .limit(1);
  if (!w) throw new Error("Wallet not found");

  const current = parseFloat(w.balance);
  const debit = parseFloat(amount);
  if (current + 0.01 < debit) {
    throw new Error("Insufficient balance");
  }

  const newBalance = Math.max(0, current - debit).toFixed(8);
  await db
    .update(wallet)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(wallet.id, walletId));

  return newBalance;
}

export async function createWallet(
  userId: string,
  currency: string = DEFAULT_CURRENCY
) {
  const id = generateId();
  await db.insert(wallet).values({
    id,
    userId,
    currency,
    balance: "0",
  });
  return id;
}

export async function getOrCreateWallet(
  userId: string,
  currency: string = DEFAULT_CURRENCY
) {
  const [existing] = await db
    .select()
    .from(wallet)
    .where(and(eq(wallet.userId, userId), eq(wallet.currency, currency)))
    .limit(1);

  if (existing) return existing;

  const id = generateId();
  await db.insert(wallet).values({
    id,
    userId,
    currency,
    balance: "0",
  });

  const [created] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.id, id))
    .limit(1);

  return created!;
}

export async function getWallets(userId: string) {
  return db.select().from(wallet).where(eq(wallet.userId, userId));
}

export async function getWalletBalance(
  userId: string,
  currency?: string
): Promise<{ balance: string; currency: string }[] | { balance: string; currency: string }> {
  const wallets = await getWallets(userId);

  if (wallets.length === 0) {
    return currency ? { balance: "0", currency: currency } : [];
  }

  const filtered = currency
    ? wallets.filter((w: any) => w.currency === currency)
    : wallets;

  if (currency && filtered.length === 0) {
    return { balance: "0", currency };
  }

  if (currency) {
    return {
      balance: filtered[0]!.balance,
      currency: filtered[0]!.currency,
    };
  }

  return filtered.map((w: any) => ({ balance: w.balance, currency: w.currency }));
}

export async function logTransaction(params: {
  walletId: string;
  type: string;
  amount: string;
  currency: string;
  status?: string;
  orderId?: string;
  externalReference?: string;
  metadata?: Record<string, unknown>;
}) {
  const id = generateId();
  await db.insert(transaction).values({
    id,
    walletId: params.walletId,
    type: params.type,
    amount: params.amount,
    currency: params.currency,
    status: params.status ?? "completed",
    orderId: params.orderId,
    externalReference: params.externalReference,
    metadata: params.metadata,
  });
  return id;
}
