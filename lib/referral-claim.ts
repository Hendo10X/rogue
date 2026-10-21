import { cookies, headers } from "next/headers";
import { claimReferral, clientIp, REFERRAL_COOKIE } from "@/lib/referral";

/**
 * If the visitor arrived through a referral link, attach it to their account
 * along with the IP and device they're on. Safe to call on every visit — it
 * no-ops once claimed and never throws.
 */
export async function claimReferralFromRequest(user: {
  id: string;
  createdAt?: Date | string | null;
}): Promise<void> {
  try {
    const raw = (await cookies()).get(REFERRAL_COOKIE)?.value;
    if (!raw) return;
    const h = await headers();
    await claimReferral({
      userId: user.id,
      userCreatedAt: user.createdAt,
      rawCode: decodeURIComponent(raw),
      ipAddress: clientIp(h),
      userAgent: h.get("user-agent"),
    });
  } catch {
    // Never block a page on referrals.
  }
}
