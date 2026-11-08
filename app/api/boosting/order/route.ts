import { NextRequest, NextResponse } from "next/server";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { placeBoostingOrder, type BoostingOrderInput } from "@/lib/boosting/place-order";
import { toResponse } from "@/lib/order-result";

// The order logic lives in lib/boosting/place-order.ts (shared with the Telegram bot).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (await isUserSuspended(session.user.id)) {
    return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 403 });
  }

  let body: BoostingOrderInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  return toResponse(await placeBoostingOrder(session.user.id, body));
}
