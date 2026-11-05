import { NextRequest, NextResponse } from "next/server";
import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { boostingOrder, order, otpOrder, proxyOrder } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-route";
import { creditWallet, getOrCreateWallet, logTransaction } from "@/lib/wallet";

export const dynamic = "force-dynamic";

// Orders in these states were already refunded automatically. Boosting
// "failed" orders from before automatic refunds were never refunded, so they
// stay refundable; "partial" ones already got the undelivered part back.
const DONE = ["refunded", "failed", "cancelled", "partial"];
const BOOSTING_DONE = ["refunded", "cancelled", "partial"];

const TABLES = {
  marketplace: order,
  boosting: boostingOrder,
  proxy: proxyOrder,
  otp: otpOrder,
} as const;
type Kind = keyof typeof TABLES;

// POST { type } — refunds an order's full amount to the customer's wallet.
// The status flips to "refunded" in the same statement that claims the order,
// so a double click can never refund twice.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { type?: string } | null;
  const kind = (body?.type && body.type in TABLES ? body.type : null) as Kind | null;
  if (!kind) return NextResponse.json({ error: "Unknown order type" }, { status: 400 });

  const t = TABLES[kind];
  const [claimed] = await db
    .update(t)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(and(eq(t.id, id), notInArray(t.status, kind === "boosting" ? BOOSTING_DONE : DONE)))
    .returning({ userId: t.userId, amount: t.amount });
  if (!claimed) {
    return NextResponse.json({ error: "This order was already refunded, or doesn't exist." }, { status: 409 });
  }

  const amount = Number(claimed.amount).toFixed(2);
  const wallet = await getOrCreateWallet(claimed.userId, "NGN");
  await creditWallet(wallet.id, amount, "NGN");
  await logTransaction({
    walletId: wallet.id,
    type: "refund",
    amount,
    currency: "NGN",
    status: "completed",
    metadata: { reason: "admin_refund", orderId: id, orderType: kind, by: admin.username },
  });
  return NextResponse.json({ ok: true, amount });
}
