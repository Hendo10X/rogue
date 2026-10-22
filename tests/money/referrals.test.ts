// Run with `npm run test:money`. End-to-end check of the referral system against a real Postgres (PGlite).
// Uses the real lib/referral.ts, lib/wallet.ts and db/schema.ts.
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { user, session, wallet, deposit, referral, transaction } from "@/db/schema";
import {
  claimReferral,
  getOrCreateReferralCode,
  getReferralSummary,
  rewardReferralForDeposit,
  setReferralPercent,
  setReferralStatus,
  listReferralsForAdmin,
} from "@/lib/referral";
import { getOrCreateWallet } from "@/lib/wallet";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`, detail ?? "");
  }
}

let n = 0;
async function makeUser(opts: { ip?: string; ageDays?: number } = {}) {
  const id = `u${++n}`;
  const created = new Date(Date.now() - (opts.ageDays ?? 0) * 86400_000);
  await db.insert(user).values({ id, name: `User ${n}`, email: `${id}@test.dev`, createdAt: created, updatedAt: created });
  if (opts.ip) {
    await db.insert(session).values({
      id: `s-${id}`,
      token: `t-${id}`,
      userId: id,
      ipAddress: opts.ip,
      expiresAt: new Date(Date.now() + 86400_000),
      createdAt: created,
      updatedAt: created,
    });
  }
  const w = await getOrCreateWallet(id, "NGN");
  return { id, createdAt: created, walletId: w.id };
}

let d = 0;
/** Mimics a webhook: mark a deposit completed, credit, then call the reward hook. */
async function completeDeposit(u: { id: string; walletId: string }, amount: number) {
  const id = `dep${++d}`;
  await db.insert(deposit).values({
    id,
    userId: u.id,
    walletId: u.walletId,
    amount: String(amount),
    currency: "NGN",
    provider: "korapay",
    plisioOrderNumber: `ord-${id}`,
    status: "completed",
    completedAt: new Date(),
  });
  await rewardReferralForDeposit({ userId: u.id, depositId: id, amountNgn: amount });
  return id;
}

async function balance(walletId: string) {
  const [w] = await db.select().from(wallet).where(eq(wallet.id, walletId));
  return Number(w.balance);
}
async function referralOf(userId: string) {
  const [r] = await db.select().from(referral).where(eq(referral.referredId, userId));
  return r;
}

async function main() {
  // Build the real tables from db/schema.ts.
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();
  await setReferralPercent(10);

  console.log("\n1. Normal referral pays 10% of the first deposit, once");
  const alice = await makeUser({ ip: "1.1.1.1" });
  const code = await getOrCreateReferralCode(alice.id);
  check("code is 7 readable characters", /^[A-HJ-NP-Z2-9]{7}$/.test(code), code);
  check("same code returned again", (await getOrCreateReferralCode(alice.id)) === code);
  const bob = await makeUser({ ip: "2.2.2.2" });
  await claimReferral({ userId: bob.id, userCreatedAt: bob.createdAt, rawCode: code.toLowerCase(), ipAddress: "2.2.2.2", userAgent: "UA" });
  let r = await referralOf(bob.id);
  check("referral recorded as pending", r?.status === "pending", r);
  check("IP recorded", r?.ipAddress === "2.2.2.2");
  const dep1 = await completeDeposit(bob, 20000);
  check("referrer credited ₦2,000", (await balance(alice.walletId)) === 2000, await balance(alice.walletId));
  r = await referralOf(bob.id);
  check("referral marked rewarded with amount", r?.status === "rewarded" && Number(r.rewardAmount) === 2000, r);
  const [tx] = await db.select().from(transaction).where(eq(transaction.walletId, alice.walletId));
  check("reward logged as referral_reward transaction", tx?.type === "referral_reward", tx);

  console.log("\n2. Duplicate webhook for the same deposit can't pay twice");
  await rewardReferralForDeposit({ userId: bob.id, depositId: dep1, amountNgn: 20000 });
  await Promise.all([
    rewardReferralForDeposit({ userId: bob.id, depositId: dep1, amountNgn: 20000 }),
    rewardReferralForDeposit({ userId: bob.id, depositId: dep1, amountNgn: 20000 }),
  ]);
  check("still ₦2,000", (await balance(alice.walletId)) === 2000, await balance(alice.walletId));

  console.log("\n3. Second deposit never pays");
  await completeDeposit(bob, 50000);
  check("still ₦2,000 after second deposit", (await balance(alice.walletId)) === 2000);

  console.log("\n4. Claiming twice keeps the first referral");
  const carol = await makeUser({ ip: "9.9.9.9" });
  const carolCode = await getOrCreateReferralCode(carol.id);
  await claimReferral({ userId: bob.id, userCreatedAt: bob.createdAt, rawCode: carolCode, ipAddress: "2.2.2.2" });
  r = await referralOf(bob.id);
  check("bob still referred by alice", r?.referrerId === alice.id, r);

  console.log("\n5. Self-referral is ignored");
  await claimReferral({ userId: alice.id, userCreatedAt: alice.createdAt, rawCode: code, ipAddress: "1.1.1.1" });
  check("no referral for alice", !(await referralOf(alice.id)));

  console.log("\n6. Same IP as the referrer is blocked and never pays");
  const sock = await makeUser({ ip: "1.1.1.1" });
  await claimReferral({ userId: sock.id, userCreatedAt: sock.createdAt, rawCode: code, ipAddress: "1.1.1.1" });
  r = await referralOf(sock.id);
  check("stored as blocked", r?.status === "blocked" && r.flagReason === "Same IP as the referrer", r);
  const before6 = await balance(alice.walletId);
  await completeDeposit(sock, 10000);
  check("no reward paid", (await balance(alice.walletId)) === before6);

  console.log("\n7. Two referrals from one IP: the second is blocked");
  const dave = await makeUser({ ip: "3.3.3.3" });
  await claimReferral({ userId: dave.id, userCreatedAt: dave.createdAt, rawCode: code, ipAddress: "3.3.3.3" });
  const erin = await makeUser({ ip: "3.3.3.3" });
  await claimReferral({ userId: erin.id, userCreatedAt: erin.createdAt, rawCode: code, ipAddress: "3.3.3.3" });
  check("first from that IP pending", (await referralOf(dave.id))?.status === "pending");
  r = await referralOf(erin.id);
  check("second from same IP blocked", r?.status === "blocked" && /another of their referrals/.test(r.flagReason ?? ""), r);

  console.log("\n8. Admin can allow a blocked referral; it then pays");
  check("allow succeeds", await setReferralStatus(r!.id, "pending"));
  const before8 = await balance(alice.walletId);
  await completeDeposit(erin, 5000);
  check("₦500 paid after allow", (await balance(alice.walletId)) === before8 + 500, (await balance(alice.walletId)) - before8);
  check("rewarded referral can't be re-blocked", !(await setReferralStatus(r!.id, "blocked")));

  console.log("\n9. Admin block stops a pending referral");
  const before9 = await balance(alice.walletId);
  check("block succeeds", await setReferralStatus((await referralOf(dave.id))!.id, "blocked"));
  await completeDeposit(dave, 8000);
  check("no reward after block", (await balance(alice.walletId)) === before9);

  console.log("\n10. Users who already deposited can't be referred later");
  const fay = await makeUser({ ip: "4.4.4.4" });
  await completeDeposit(fay, 1000);
  await claimReferral({ userId: fay.id, userCreatedAt: fay.createdAt, rawCode: code, ipAddress: "4.4.4.4" });
  check("no referral recorded", !(await referralOf(fay.id)));

  console.log("\n11. Accounts older than 7 days can't claim");
  const old = await makeUser({ ip: "5.5.5.5", ageDays: 10 });
  await claimReferral({ userId: old.id, userCreatedAt: old.createdAt, rawCode: code, ipAddress: "5.5.5.5" });
  check("no referral recorded", !(await referralOf(old.id)));

  console.log("\n12. Unknown or malformed codes are ignored");
  const gus = await makeUser({ ip: "6.6.6.6" });
  await claimReferral({ userId: gus.id, userCreatedAt: gus.createdAt, rawCode: "NOPE123", ipAddress: "6.6.6.6" });
  await claimReferral({ userId: gus.id, userCreatedAt: gus.createdAt, rawCode: "'; drop table--", ipAddress: "6.6.6.6" });
  check("no referral recorded", !(await referralOf(gus.id)));

  console.log("\n13. Admin percent applies to the next payout; 0% pays nothing");
  await setReferralPercent(15);
  const hal = await makeUser({ ip: "7.7.7.7" });
  await claimReferral({ userId: hal.id, userCreatedAt: hal.createdAt, rawCode: code, ipAddress: "7.7.7.7" });
  const before13 = await balance(alice.walletId);
  await completeDeposit(hal, 10000);
  check("15% → ₦1,500", (await balance(alice.walletId)) === before13 + 1500, (await balance(alice.walletId)) - before13);
  await setReferralPercent(0);
  const ivy = await makeUser({ ip: "8.8.8.8" });
  await claimReferral({ userId: ivy.id, userCreatedAt: ivy.createdAt, rawCode: code, ipAddress: "8.8.8.8" });
  const before13b = await balance(alice.walletId);
  await completeDeposit(ivy, 10000);
  check("0% → nothing paid", (await balance(alice.walletId)) === before13b);
  check("0% leaves referral pending (not burned)", (await referralOf(ivy.id))?.status === "pending");
  let threw = false;
  try { await setReferralPercent(150); } catch { threw = true; }
  check("percent over 100 rejected", threw);
  await setReferralPercent(10);

  console.log("\n14. Summary and admin list");
  const sum = await getReferralSummary(alice.id);
  check("summary counts exclude blocked (6 total - 2 blocked = 4)", sum?.invited === 4, sum);
  check("summary earned total", sum?.earned === 2000 + 500 + 1500, sum);
  const rows = await listReferralsForAdmin();
  const shared = rows.find((x) => x.ipAddress === "3.3.3.3");
  check("admin list flags shared IP (2 accounts)", shared?.ipShared === 2, shared);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("CRASHED:", e);
  process.exit(1);
});
