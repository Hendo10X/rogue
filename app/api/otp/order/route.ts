import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { placeOtpOrder } from "@/lib/otp/place-order";
import { toResponse } from "@/lib/order-result";

export const dynamic = "force-dynamic";

// POST { country, app } — buys a number. The logic lives in lib/otp/place-order.ts
// (shared with the Telegram bot).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isUserSuspended(session.user.id)) return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { country?: unknown; app?: unknown } | null;
  const country = typeof body?.country === "string" ? body.country : "";
  const app = typeof body?.app === "string" ? body.app : "";
  return toResponse(await placeOtpOrder(session.user.id, { country, app }));
}
