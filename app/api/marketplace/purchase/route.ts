import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { listing, supplier, order, wallet } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateWallet, debitWallet } from "@/lib/wallet";
import { getOrderQueue } from "@/lib/queue/order-queue";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listingSlug: string; quantity: number; coupon?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const quantity = Math.max(1, Math.min(1000, body.quantity ?? 1));

  const [list] = await db
    .select({
      id: listing.id,
      externalProductId: listing.externalProductId,
      supplierId: listing.supplierId,
      title: listing.title,
      price: listing.price,
      stock: listing.stock,
      platform: listing.platform,
    })
    .from(listing)
    .where(eq(listing.slug, body.listingSlug))
    .limit(1);

  if (!list) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (list.stock < quantity) {
    return NextResponse.json(
      { error: "Insufficient stock" },
      { status: 400 }
    );
  }

  const [sup] = await db
    .select()
    .from(supplier)
    .where(eq(supplier.id, list.supplierId))
    .limit(1);

  if (!sup?.apiUrl || !sup?.apiKey) {
    return NextResponse.json(
      { error: "Supplier not configured" },
      { status: 500 }
    );
  }

  const totalAmount = (parseFloat(list.price) * quantity).toFixed(2);
  const walletRow = await getOrCreateWallet(session.user.id, "USDT");
  const balance = parseFloat(walletRow.balance);

  if (balance < parseFloat(totalAmount)) {
    return NextResponse.json(
      { error: "Insufficient wallet balance. Fund your wallet first." },
      { status: 400 }
    );
  }

  const orderId = crypto.randomUUID();

  try {
    await debitWallet(walletRow.id, totalAmount, "USDT");
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to debit wallet. Try again." },
      { status: 400 }
    );
  }

  await db.insert(order).values({
    id: orderId,
    userId: session.user.id,
    listingId: list.id,
    status: "pending",
    amount: totalAmount,
    currency: "USD",
    quantity,
    walletId: walletRow.id,
    metadata: { coupon: body.coupon },
  });

  try {
    const queue = getOrderQueue();
    await queue.add(
      "process-order",
      {
        orderId,
      },
      {
        jobId: orderId,
      }
    );
  } catch (e) {
    await db
      .update(order)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(order.id, orderId));
    await db
      .update(wallet)
      .set({
        balance: (balance).toFixed(8),
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id));
    return NextResponse.json(
      { error: "Failed to queue order. Please try again." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    orderId,
    message: "Order placed. Processing in the background.",
    status: "pending",
  });
}
