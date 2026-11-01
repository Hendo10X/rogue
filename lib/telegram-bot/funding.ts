import { db } from "@/db/drizzle";
import { deposit } from "@/db/schema";
import { getOrCreateWallet } from "@/lib/wallet";
import { SITE_URL } from "@/lib/site";

export const MIN_FUND = 1000;
export const MAX_FUND = 10_000_000;

/**
 * Starts a Flutterwave wallet top-up and returns the hosted payment link.
 * The deposit row uses the same tx_ref scheme as the website, so the existing
 * webhook and verify logic credit it; /api/telegram/paid also checks it as
 * soon as the customer comes back from paying.
 */
export async function createFundingLink(args: { userId: string; email: string; name: string; amountNgn: number }): Promise<string> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  if (!key) throw new Error("Flutterwave isn't configured");
  const wallet = await getOrCreateWallet(args.userId, "NGN");
  const depositId = crypto.randomUUID();
  const txRef = `dep_${depositId.replace(/-/g, "")}`;
  const amount = Math.round(args.amountNgn);

  await db.insert(deposit).values({
    id: depositId,
    userId: args.userId,
    walletId: wallet.id,
    amount: String(amount),
    currency: "NGN",
    provider: "flutterwave",
    plisioOrderNumber: txRef,
    status: "pending",
  });

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: txRef,
      amount,
      currency: "NGN",
      redirect_url: `${SITE_URL}/api/telegram/paid`,
      customer: { email: args.email, name: args.name },
      customizations: { title: "Rogue Socials wallet" },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => null)) as { status?: string; data?: { link?: string }; message?: string } | null;
  if (!res.ok || !data?.data?.link) {
    console.error("[ShopBot] Flutterwave link failed", data?.message);
    throw new Error("Couldn't create the payment link");
  }
  return data.data.link;
}
