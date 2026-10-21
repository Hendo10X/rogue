import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/admin-auth";
import {
  getReferralPercent,
  listReferralsForAdmin,
  setReferralPercent,
  setReferralStatus,
} from "@/lib/referral";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [percent, referrals] = await Promise.all([getReferralPercent(), listReferralsForAdmin()]);
    return NextResponse.json({ percent, referrals });
  } catch (err) {
    console.error("[Admin referrals] list failed", err);
    return NextResponse.json(
      { error: "Referrals aren't set up yet. Apply migration 0006_add_referrals.sql." },
      { status: 500 }
    );
  }
}

const patchSchema = z.union([
  z.object({ percent: z.coerce.number().min(0).max(100) }),
  z.object({ id: z.string().min(1), status: z.enum(["pending", "blocked"]) }),
]);

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if ("percent" in parsed.data) {
      await setReferralPercent(parsed.data.percent);
      return NextResponse.json({ ok: true, percent: await getReferralPercent() });
    }
    const ok = await setReferralStatus(parsed.data.id, parsed.data.status);
    if (!ok) {
      return NextResponse.json({ error: "Referral not found or already paid" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admin referrals] update failed", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
