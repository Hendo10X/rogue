import { db } from "../db/drizzle";
import { deposit, listing } from "../db/schema";
import { eq } from "drizzle-orm";
import { creditWallet, logTransaction } from "../lib/wallet";

/**
 * MANUAL FIX SCRIPT
 * Use this to manually credit a wallet if a Korapay webhook was missed.
 * Replace 'YOUR_DEPOSIT_ID' with the actual ID from your database.
 */
async function fixDeposit(depositId: string) {
  console.log(`Attempting to fix deposit: ${depositId}`);

  try {
    const [dep] = await db
      .select()
      .from(deposit)
      .where(eq(deposit.id, depositId))
      .limit(1);

    if (!dep) {
      console.error("Deposit not found!");
      return;
    }

    if (dep.status === "completed") {
      console.log("Deposit is already completed. No action needed.");
      return;
    }

    const amountNgn = parseFloat(dep.amount);

    console.log(`Crediting wallet ${dep.walletId} with ₦${amountNgn} NGN...`);

    await db
      .update(deposit)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(deposit.id, depositId));

    await creditWallet(dep.walletId, String(amountNgn), "NGN");

    await logTransaction({
      walletId: dep.walletId,
      type: "deposit",
      amount: String(amountNgn),
      currency: "NGN",
      status: "completed",
      metadata: {
        manualFix: true,
        originalDepositId: dep.id,
      },
    });

    console.log("Deposit fixed and wallet credited successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to fix deposit:", error);
    process.exit(1);
  }
}

// Pass the deposit ID as an argument: npx tsx scripts/fix-deposit.ts <depositId>
const id = process.argv[2];
if (!id) {
  console.error("Please provide a deposit ID: npx tsx scripts/fix-deposit.ts <id>");
  process.exit(1);
}

fixDeposit(id);
