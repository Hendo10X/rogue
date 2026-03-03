import { eq, and } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { wallet, transaction } from "@/db/schema";

const DEFAULT_CURRENCY = "USDT";

function generateId() {
  return crypto.randomUUID();
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
    ? wallets.filter((w) => w.currency === currency)
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

  return filtered.map((w) => ({ balance: w.balance, currency: w.currency }));
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
