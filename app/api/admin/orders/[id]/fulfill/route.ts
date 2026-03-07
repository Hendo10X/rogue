import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { order, accountDelivery, user, listing } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  
  let body: { credentials?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.credentials?.trim()) {
    return NextResponse.json(
      { error: "Credentials are required" },
      { status: 400 }
    );
  }

  const [existingOrder] = await db
    .select({
      id: order.id,
      status: order.status,
      userId: order.userId,
      listingId: order.listingId,
    })
    .from(order)
    .where(eq(order.id, id))
    .limit(1);

  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (existingOrder.status === "completed") {
    return NextResponse.json(
      { error: "Order is already completed" },
      { status: 400 }
    );
  }

  const [list] = await db
    .select({ platform: listing.platform })
    .from(listing)
    .where(eq(listing.id, existingOrder.listingId))
    .limit(1);

  // Check if a pending delivery record exists
  const [existingDelivery] = await db
    .select()
    .from(accountDelivery)
    .where(eq(accountDelivery.orderId, id))
    .limit(1);

  if (existingDelivery) {
    await db
      .update(accountDelivery)
      .set({
        notes: body.credentials,
        deliveryStatus: "delivered",
        deliveredAt: new Date(),
      })
      .where(eq(accountDelivery.id, existingDelivery.id));
  } else {
    await db.insert(accountDelivery).values({
      id: crypto.randomUUID(),
      orderId: id,
      platform: list?.platform ?? "unknown",
      notes: body.credentials,
      deliveryStatus: "delivered",
      deliveredAt: new Date(),
    });
  }

  await db
    .update(order)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(order.id, id));

  // Try to send email
  try {
    const [usr] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, existingOrder.userId))
      .limit(1);

    if (usr?.email) {
      const { sendOrderDeliveryEmail } = await import("@/lib/email");
      await sendOrderDeliveryEmail({
        to: usr.email,
        orderId: id,
        platform: list?.platform ?? "unknown",
        details: {
          notes: body.credentials,
        },
      });
    }
  } catch (error) {
    console.error("Failed to send fulfillment email:", error);
    // Don't fail the request if just the email fails
  }

  return NextResponse.json({ success: true, message: "Order fulfilled manually." });
}
