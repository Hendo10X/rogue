import { db } from "@/db/drizzle";
import { deposit } from "@/db/schema";
import { getOrCreateWallet } from "@/lib/wallet";
import { getUSDtoNGNRate } from "@/lib/currency";
import { createPlisioInvoice } from "@/lib/plisio";
import { isPlaceholderEmail } from "@/lib/email";
import { getManualFunding, type ManualFunding } from "@/lib/manual-funding";
import { SITE_URL } from "@/lib/site";

export const MIN_FUND = 1000;
export const MAX_FUND = 10_000_000;

/**
 * Wallet top-ups from the bot, with the same payment methods as the website.
 * Each one creates the same kind of deposit row as the website (tx_ref
 * "dep_…"), so the existing webhooks credit it and message the bot customer.
 */
export type FundMethod = "flutterwave" | "korapay" | "crypto";

export const FUND_METHODS: { id: FundMethod; label: string; note: string; env: string }[] = [
  { id: "korapay", label: "💳 Card / transfer (Korapay)", note: "card or bank transfer", env: "KORAPAY_SECRET_KEY" },
  { id: "flutterwave", label: "💳 Card / transfer / USSD (Flutterwave)", note: "card, transfer or USSD", env: "FLUTTERWAVE_SECRET_KEY" },
  { id: "crypto", label: "🪙 Crypto (USDT, BTC…)", note: "crypto", env: "PLISIO_API_KEY" },
];

/** Methods that have their keys set. */
export function availableFundMethods() {
  return FUND_METHODS.filter((m) => !!process.env[m.env]?.trim());
}

type Customer = { userId: string; email: string; name: string };

async function newDeposit(c: Customer, provider: "flutterwave" | "korapay" | "plisio", amount: string) {
  const wallet = await getOrCreateWallet(c.userId, "NGN");
  const id = crypto.randomUUID();
  const ref = `dep_${id.replace(/-/g, "")}`;
  return {
    id,
    ref,
    insert: (extra: Partial<typeof deposit.$inferInsert> = {}) =>
      db.insert(deposit).values({
        id,
        userId: c.userId,
        walletId: wallet.id,
        amount,
        currency: "NGN",
        provider,
        plisioOrderNumber: ref,
        status: "pending",
        ...extra,
      }),
  };
}

/** Starts a top-up and returns the hosted payment link to send the customer to. */
export async function createFundingLink(method: FundMethod, c: Customer, amountNgn: number): Promise<string> {
  const amount = Math.round(amountNgn);
  if (method === "flutterwave") return flutterwaveLink(c, amount);
  if (method === "korapay") return korapayLink(c, amount);
  return cryptoLink(c, amount);
}

async function flutterwaveLink(c: Customer, amount: number): Promise<string> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  if (!key) throw new Error("Flutterwave isn't configured");
  const dep = await newDeposit(c, "flutterwave", String(amount));
  await dep.insert();
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: dep.ref,
      amount,
      currency: "NGN",
      redirect_url: `${SITE_URL}/api/telegram/paid`,
      customer: { email: c.email, name: c.name },
      customizations: { title: "Rogue Socials wallet" },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => null)) as { data?: { link?: string }; message?: string } | null;
  if (!res.ok || !data?.data?.link) {
    console.error("[ShopBot] Flutterwave link failed", data?.message);
    throw new Error("Couldn't create the payment link");
  }
  return data.data.link;
}

/** Korapay's hosted checkout (the website uses its popup instead; same reference scheme and webhook). */
async function korapayLink(c: Customer, amount: number): Promise<string> {
  const key = process.env.KORAPAY_SECRET_KEY?.trim();
  if (!key) throw new Error("Korapay isn't configured");
  const dep = await newDeposit(c, "korapay", String(amount));
  await dep.insert();
  const res = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: dep.ref,
      amount,
      currency: "NGN",
      narration: "Rogue Socials wallet",
      redirect_url: `${SITE_URL}/api/telegram/paid`,
      notification_url: `${SITE_URL}/api/webhooks/korapay`,
      customer: { name: c.name, email: c.email },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => null)) as { status?: boolean; data?: { checkout_url?: string }; message?: string } | null;
  if (!res.ok || !data?.data?.checkout_url) {
    console.error("[ShopBot] Korapay link failed", data?.message);
    throw new Error("Couldn't create the payment link");
  }
  return data.data.checkout_url;
}

/**
 * Crypto through Plisio. Plisio invoices are in USD, so the ₦ amount is
 * converted at today's rate; the webhook converts back when it credits
 * (same as the website, whose crypto deposits are entered in USD).
 */
async function cryptoLink(c: Customer, amountNgn: number): Promise<string> {
  const key = process.env.PLISIO_API_KEY?.trim();
  if (!key) throw new Error("Crypto payments aren't configured");
  const rate = await getUSDtoNGNRate();
  const usd = Math.ceil((amountNgn / rate) * 100) / 100;
  const dep = await newDeposit(c, "plisio", usd.toFixed(2));
  const result = await createPlisioInvoice(key, {
    orderNumber: dep.ref,
    orderName: "Wallet deposit",
    sourceCurrency: "USD",
    sourceAmount: usd,
    callbackUrl: `${SITE_URL}/api/webhooks/plisio?json=true`,
    successCallbackUrl: `${SITE_URL}/api/telegram/paid`,
    email: isPlaceholderEmail(c.email) ? undefined : c.email,
  });
  if (result.status !== "success" || !result.data) {
    console.error("[ShopBot] Plisio invoice failed", JSON.stringify(result).slice(0, 300));
    throw new Error("Couldn't create the crypto invoice");
  }
  await dep.insert({ plisioTxnId: result.data.txn_id, invoiceUrl: result.data.invoice_url });
  return result.data.invoice_url;
}

/** Bank-transfer details (same as the website's manual deposit). */
export function manualFunding(): Promise<ManualFunding> {
  return getManualFunding();
}
