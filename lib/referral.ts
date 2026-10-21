import { and, count, desc, eq, ne, sql, sum } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { deposit, referral, referralCode, session, user } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { creditWallet, getOrCreateWallet, logTransaction } from "@/lib/wallet";
import { getSetting, setSetting } from "@/lib/admin-auth";

/** Default share of the referred user's first deposit, in percent. */
export const DEFAULT_REFERRAL_PERCENT = 10;
const PERCENT_KEY = "referral_percent";

/** Current referral percent (0 turns rewards off). Falls back to the default. */
export async function getReferralPercent(): Promise<number> {
  try {
    const raw = await getSetting(PERCENT_KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_REFERRAL_PERCENT;
  } catch {
    return DEFAULT_REFERRAL_PERCENT;
  }
}

export async function setReferralPercent(percent: number): Promise<void> {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("Percent must be between 0 and 100");
  }
  await setSetting(PERCENT_KEY, String(Math.round(percent * 100) / 100));
}

/** First address in x-forwarded-for, else x-real-ip. */
export function clientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || null;
}

/** Cookie that carries a `?ref=` code from the sign-up link to the new account. */
export const REFERRAL_COOKIE = "rogue_ref";

/** A referral is only claimed by accounts this new, so old users can't attach one later. */
const CLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// No 0/O/1/I/L, so codes survive being read aloud or retyped.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizeCode(raw: string | null | undefined) {
  const code = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : null;
}

/** The user's referral code, created on first request. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const [existing] = await db
    .select({ code: referralCode.code })
    .from(referralCode)
    .where(eq(referralCode.userId, userId))
    .limit(1);
  if (existing) return existing.code;

  // Retry on the (unlikely) chance of a code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      await db.insert(referralCode).values({ userId, code }).onConflictDoNothing();
      const [row] = await db
        .select({ code: referralCode.code })
        .from(referralCode)
        .where(eq(referralCode.userId, userId))
        .limit(1);
      if (row) return row.code;
    } catch {
      // Unique clash on `code` — try another.
    }
  }
  throw new Error("Could not allocate a referral code");
}

/**
 * Attach the referral carried in the sign-up cookie to a newly created
 * account. Silently does nothing when the code is unknown, self-referral,
 * the account isn't new, the user has already deposited, or a referral is
 * already recorded. Never throws.
 */
export async function claimReferral(params: {
  userId: string;
  userCreatedAt: Date | string | null | undefined;
  rawCode: string | null | undefined;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const code = normalizeCode(params.rawCode);
    if (!code) return;

    const created = params.userCreatedAt ? new Date(params.userCreatedAt) : null;
    if (!created || Date.now() - created.getTime() > CLAIM_WINDOW_MS) return;

    const [owner] = await db
      .select({ userId: referralCode.userId })
      .from(referralCode)
      .where(eq(referralCode.code, code))
      .limit(1);
    if (!owner || owner.userId === params.userId) return;

    // Only users who haven't funded yet can be referred.
    const [{ value: completed }] = await db
      .select({ value: count() })
      .from(deposit)
      .where(and(eq(deposit.userId, params.userId), eq(deposit.status, "completed")));
    if (Number(completed) > 0) return;

    // Anti-cheat: the same IP as the referrer, or an IP another of their
    // referrals already used, means it is probably the same person. Those are
    // recorded (so the admin can see them) but blocked from paying out.
    const ip = params.ipAddress?.trim() || null;
    let flagReason: string | null = null;
    if (ip) {
      const [referrerSeen] = await db
        .select({ value: count() })
        .from(session)
        .where(and(eq(session.userId, owner.userId), eq(session.ipAddress, ip)));
      if (Number(referrerSeen?.value ?? 0) > 0) {
        flagReason = "Same IP as the referrer";
      } else {
        const [repeat] = await db
          .select({ value: count() })
          .from(referral)
          .where(
            and(
              eq(referral.referrerId, owner.userId),
              eq(referral.ipAddress, ip),
              ne(referral.referredId, params.userId)
            )
          );
        if (Number(repeat?.value ?? 0) > 0) flagReason = "IP already used by another of their referrals";
      }
    }

    await db
      .insert(referral)
      .values({
        id: crypto.randomUUID(),
        referrerId: owner.userId,
        referredId: params.userId,
        code,
        status: flagReason ? "blocked" : "pending",
        flagReason,
        ipAddress: ip,
        userAgent: params.userAgent?.slice(0, 400) ?? null,
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error("[Referral] claim failed", err);
  }
}

/**
 * Pay the referrer when a referred user's FIRST deposit completes. Call it
 * after the deposit has been marked completed and credited. The pending →
 * rewarded update is the guard: only the call that wins it pays out, so
 * duplicate webhooks can't double-pay. Never throws — a referral problem must
 * never fail a deposit.
 */
export async function rewardReferralForDeposit(params: {
  userId: string;
  depositId: string;
  amountNgn: number;
}): Promise<void> {
  try {
    const amount = Number(params.amountNgn);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const [pending] = await db
      .select({ id: referral.id, referrerId: referral.referrerId })
      .from(referral)
      .where(and(eq(referral.referredId, params.userId), eq(referral.status, "pending")))
      .limit(1);
    if (!pending) return;

    // Only the first completed deposit counts.
    const [{ value: completed }] = await db
      .select({ value: count() })
      .from(deposit)
      .where(and(eq(deposit.userId, params.userId), eq(deposit.status, "completed")));
    if (Number(completed) !== 1) {
      if (Number(completed) > 1) {
        // Their first deposit already went by without a reward; close it out.
        await db
          .update(referral)
          .set({ status: "expired" })
          .where(and(eq(referral.id, pending.id), eq(referral.status, "pending")));
      }
      return;
    }

    const percent = await getReferralPercent();
    const reward = Math.round(amount * percent) / 100;
    if (reward <= 0) return;

    const claimed = await db
      .update(referral)
      .set({
        status: "rewarded",
        rewardAmount: reward.toFixed(2),
        depositId: params.depositId,
        rewardedAt: new Date(),
      })
      .where(and(eq(referral.id, pending.id), eq(referral.status, "pending")))
      .returning({ id: referral.id });
    if (claimed.length === 0) return; // another call already paid it

    const referrerWallet = await getOrCreateWallet(pending.referrerId, "NGN");
    await creditWallet(referrerWallet.id, reward.toFixed(2), "NGN");
    await logTransaction({
      walletId: referrerWallet.id,
      type: "referral_reward",
      amount: reward.toFixed(2),
      currency: "NGN",
      status: "completed",
      metadata: {
        referralId: pending.id,
        referredUserId: params.userId,
        depositId: params.depositId,
        depositAmountNgn: amount,
        percent,
      },
    });
    console.log("[Referral] Paid", reward, "NGN to", pending.referrerId, "for deposit", params.depositId);
  } catch (err) {
    console.error("[Referral] reward failed", err);
  }
}

export type ReferralSummary = {
  code: string;
  percent: number;
  invited: number;
  rewarded: number;
  earned: number;
};

/** Code plus totals for the referral card. Returns null if referrals aren't available. */
export async function getReferralSummary(userId: string): Promise<ReferralSummary | null> {
  try {
    const code = await getOrCreateReferralCode(userId);
    const [row] = await db
      .select({
        invited: sql<number>`count(*) filter (where ${referral.status} <> 'blocked')`,
        rewarded: sql<number>`count(*) filter (where ${referral.status} = 'rewarded')`,
        earned: sum(referral.rewardAmount),
      })
      .from(referral)
      .where(eq(referral.referrerId, userId));
    return {
      code,
      percent: await getReferralPercent(),
      invited: Number(row?.invited ?? 0),
      rewarded: Number(row?.rewarded ?? 0),
      earned: Number(row?.earned ?? 0),
    };
  } catch (err) {
    console.error("[Referral] summary failed", err);
    return null;
  }
}

/* ── Admin ──────────────────────────────────────────────────────────── */

export type AdminReferralRow = {
  id: string;
  code: string;
  status: string;
  flagReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  /** How many referrals (across all referrers) came from this IP. */
  ipShared: number;
  rewardAmount: number | null;
  createdAt: string;
  rewardedAt: string | null;
  referrer: { id: string; name: string; email: string };
  referred: { id: string; name: string; email: string };
};

/** Every referral, newest first, with both accounts and IP-sharing counts. */
export async function listReferralsForAdmin(limit = 500): Promise<AdminReferralRow[]> {
  const referrer = alias(user, "referrer");
  const referred = alias(user, "referred");

  const rows = await db
    .select({
      id: referral.id,
      code: referral.code,
      status: referral.status,
      flagReason: referral.flagReason,
      ipAddress: referral.ipAddress,
      userAgent: referral.userAgent,
      rewardAmount: referral.rewardAmount,
      createdAt: referral.createdAt,
      rewardedAt: referral.rewardedAt,
      referrerId: referrer.id,
      referrerName: referrer.name,
      referrerEmail: referrer.email,
      referredId: referred.id,
      referredName: referred.name,
      referredEmail: referred.email,
    })
    .from(referral)
    .innerJoin(referrer, eq(referral.referrerId, referrer.id))
    .innerJoin(referred, eq(referral.referredId, referred.id))
    .orderBy(desc(referral.createdAt))
    .limit(limit);

  const ipCounts = new Map<string, number>();
  const shared = await db
    .select({ ip: referral.ipAddress, n: count() })
    .from(referral)
    .groupBy(referral.ipAddress);
  for (const r of shared) if (r.ip) ipCounts.set(r.ip, Number(r.n));

  return rows.map((r: (typeof rows)[number]) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    flagReason: r.flagReason,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    ipShared: r.ipAddress ? ipCounts.get(r.ipAddress) ?? 1 : 0,
    rewardAmount: r.rewardAmount == null ? null : Number(r.rewardAmount),
    createdAt: new Date(r.createdAt).toISOString(),
    rewardedAt: r.rewardedAt ? new Date(r.rewardedAt).toISOString() : null,
    referrer: { id: r.referrerId, name: r.referrerName, email: r.referrerEmail },
    referred: { id: r.referredId, name: r.referredName, email: r.referredEmail },
  }));
}

/**
 * Admin override: block a referral, or allow a blocked one to pay on the
 * referred user's first deposit. Rewarded referrals are final.
 */
export async function setReferralStatus(id: string, status: "pending" | "blocked"): Promise<boolean> {
  const updated = await db
    .update(referral)
    .set({
      status,
      flagReason: status === "blocked" ? "Blocked by admin" : null,
    })
    .where(and(eq(referral.id, id), ne(referral.status, "rewarded")))
    .returning({ id: referral.id });
  return updated.length > 0;
}
