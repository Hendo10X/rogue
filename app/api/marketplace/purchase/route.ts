import { NextRequest, NextResponse } from "next/server";
import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { purchaseListing, type PurchaseBody } from "@/lib/marketplace-purchase";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";

export const maxDuration = 60; // Allow enough time for supplier API and Email

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

  let body: PurchaseBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  return purchaseListing(session.user.id, body);
}
