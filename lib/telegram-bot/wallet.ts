import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { esc } from "./api";
import { setPending, type MemberAccount } from "./accounts";
import { availableFundMethods, createFundingLink, manualFunding, MAX_FUND, MIN_FUND, type FundMethod } from "./funding";
import { balanceOf, MENU_BUTTON, MENU_ROW, naira, pairs, type Ctx, type Out } from "./ui";

/** Balance and funding (every website payment method). */

const FUND_AMOUNTS = [2000, 5000, 10000, 20000, 50000, 100000];

export async function showBalance(out: Out, account: MemberAccount) {
  const bal = await balanceOf(account);
  return out(`👛 Your balance is <b>${naira(bal)}</b>.`, [[{ text: "💰 Fund wallet", callback_data: "fund" }], MENU_ROW]);
}

export function showFund(out: Out) {
  return out("💰 <b>Fund wallet</b>\nHow much do you want to add?", [
    ...pairs(FUND_AMOUNTS.map((n) => ({ text: naira(n), callback_data: `f:${n}` }))),
    [{ text: "✏️ Other amount", callback_data: "fo" }],
    [{ text: "🏦 Bank transfer", callback_data: "fbk" }],
    MENU_ROW,
  ]);
}

export async function askFundAmount(ctx: Ctx) {
  await setPending(ctx.account.telegramId, { kind: "fund_amount" });
  return ctx.out(`Type the amount you want to add, between ${naira(MIN_FUND)} and ${naira(MAX_FUND)}.`, MENU_BUTTON);
}

/** The customer typed an amount. */
export async function gotFundAmount(ctx: Ctx, text: string) {
  const amount = Math.round(Number(text.replace(/[₦,\s]/g, "")));
  if (!Number.isFinite(amount) || amount < MIN_FUND || amount > MAX_FUND) {
    return ctx.out(`Please send an amount between ${naira(MIN_FUND)} and ${naira(MAX_FUND)}, e.g. <b>7500</b>.`, MENU_BUTTON);
  }
  await setPending(ctx.account.telegramId, null);
  return chooseMethod(ctx, amount);
}

/** Step 2: how to pay. One method skips straight to its link. */
export async function chooseMethod(ctx: Ctx, amount: number) {
  const { out } = ctx;
  if (!Number.isFinite(amount) || amount < MIN_FUND || amount > MAX_FUND) return showFund(out);
  const methods = availableFundMethods();
  if (methods.length === 1) return startFunding(ctx, methods[0].id, amount);
  if (!methods.length) return out("Online payments aren't available right now. You can pay by bank transfer instead.", [
    [{ text: "🏦 Bank transfer", callback_data: "fbk" }],
    MENU_ROW,
  ]);
  return out(`How do you want to pay <b>${naira(amount)}</b>?`, [
    ...methods.map((m) => [{ text: m.label, callback_data: `fp:${m.id}:${amount}` }]),
    [{ text: "🏦 Bank transfer", callback_data: "fbk" }],
    [{ text: "⬅️ Change amount", callback_data: "fund" }],
    MENU_ROW,
  ]);
}

export async function startFunding(ctx: Ctx, method: FundMethod, amount: number) {
  const m = availableFundMethods().find((x) => x.id === method);
  if (!m || !Number.isFinite(amount) || amount < MIN_FUND || amount > MAX_FUND) return showFund(ctx.out);
  const [u] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, ctx.account.userId)).limit(1);
  try {
    const link = await createFundingLink(method, { userId: ctx.account.userId, email: u?.email ?? "", name: u?.name ?? "Customer" }, amount);
    const cryptoNote = method === "crypto" ? "\nCrypto is priced in USD at today's rate; you'll get the ₦ value when it confirms." : "";
    return ctx.out(
      `Tap below to pay <b>${naira(amount)}</b> by ${m.note}. Your wallet is credited automatically and I'll message you here once it's in.${cryptoNote}`,
      [[{ text: `Pay ${naira(amount)}`, url: link }], MENU_ROW],
    );
  } catch {
    return ctx.out("We couldn't start the payment right now. Please try another method or try again in a minute.", [
      [{ text: "💰 Fund wallet", callback_data: "fund" }],
      MENU_ROW,
    ]);
  }
}

export async function showBankTransfer(out: Out) {
  const b = await manualFunding();
  return out(
    [
      "🏦 <b>Bank transfer</b>",
      "",
      `Bank: <b>${esc(b.bank)}</b>`,
      `Account name: <b>${esc(b.accountName)}</b>`,
      `Account number: <code>${esc(b.accountNumber)}</code>`,
      "",
      "After paying, send your receipt and your Telegram @username so we can credit you. Transfers are credited by hand, so card or crypto is faster.",
    ].join("\n"),
    [[{ text: "📤 Send receipt", url: b.proofUrl }], [{ text: "💰 Other ways to pay", callback_data: "fund" }], MENU_ROW],
  );
}
