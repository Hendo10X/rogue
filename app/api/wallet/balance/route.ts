import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const currency = searchParams.get("currency") ?? undefined;

  await getOrCreateWallet(session.user.id, currency ?? "NGN");
  const balance = await getWalletBalance(session.user.id, currency);

  return NextResponse.json(balance);
}
