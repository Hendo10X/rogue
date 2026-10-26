import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { otpOrder } from "@/db/schema";
import { cancelAndRefund } from "@/lib/otp/orders";

export const dynamic = "force-dynamic";

// POST { id } — cancel a number that hasn't received its SMS, and refund it.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Missing number" }, { status: 400 });

  const [row] = await db
    .select()
    .from(otpOrder)
    .where(and(eq(otpOrder.id, body.id), eq(otpOrder.userId, session.user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Number not found" }, { status: 404 });

  const result = await cancelAndRefund(row, "otp_cancelled_by_customer");
  if (!result.ok) {
    return NextResponse.json(
      { error: "This number can't be cancelled yet. Wait a minute and try again — you'll be refunded automatically if no code arrives." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
