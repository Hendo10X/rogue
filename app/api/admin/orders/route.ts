import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { order, listing, supplier, user, boostingOrder, proxyOrder, otpOrder } from "@/db/schema";
import { appLabel } from "@/lib/otp/labels";
import { eq, desc } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [marketplaceRows, boostingOrders] = await Promise.all([
    db
      .select({
        id: order.id,
        userId: order.userId,
        userEmail: user.email,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        quantity: order.quantity,
        createdAt: order.createdAt,
        title: listing.title,
        supplierName: supplier.name,
      })
      .from(order)
      .innerJoin(listing, eq(order.listingId, listing.id))
      .innerJoin(supplier, eq(listing.supplierId, supplier.id))
      .innerJoin(user, eq(order.userId, user.id))
      .orderBy(desc(order.createdAt))
      .limit(200),
    db
      .select({
        id: boostingOrder.id,
        userId: boostingOrder.userId,
        serviceName: boostingOrder.serviceName,
        link: boostingOrder.link,
        quantity: boostingOrder.quantity,
        amount: boostingOrder.amount,
        status: boostingOrder.status,
        externalOrderId: boostingOrder.externalOrderId,
        createdAt: boostingOrder.createdAt,
      })
      .from(boostingOrder)
      .orderBy(desc(boostingOrder.createdAt))
      .limit(200),
  ]);

  const userMap = new Map<string, string>();
  for (const o of boostingOrders) {
    if (!userMap.has(o.userId)) {
      const [u] = await db
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, o.userId))
        .limit(1);
      userMap.set(o.userId, u?.email ?? "");
    }
  }

  const boostingWithEmail = boostingOrders.map((o: any) => ({
    ...o,
    type: "boosting",
    userEmail: userMap.get(o.userId) ?? "",
  }));

  const marketplaceOrders = marketplaceRows.map((o: any) => ({
    ...o,
    type: "marketplace" as const,
  }));
  // Proxies and OTP numbers, shaped like boosting rows (title in serviceName).
  // Each is skipped if its table isn't migrated yet.
  const [proxyRows, otpRows] = await Promise.all([
    db
      .select({
        id: proxyOrder.id,
        userEmail: user.email,
        status: proxyOrder.status,
        amount: proxyOrder.amount,
        quantity: proxyOrder.quantity,
        createdAt: proxyOrder.createdAt,
        country: proxyOrder.country,
        period: proxyOrder.period,
        proxyType: proxyOrder.proxyType,
      })
      .from(proxyOrder)
      .innerJoin(user, eq(proxyOrder.userId, user.id))
      .orderBy(desc(proxyOrder.createdAt))
      .limit(200)
      .catch(() => []),
    db
      .select({
        id: otpOrder.id,
        userEmail: user.email,
        status: otpOrder.status,
        amount: otpOrder.amount,
        createdAt: otpOrder.createdAt,
        country: otpOrder.country,
        app: otpOrder.app,
        number: otpOrder.number,
      })
      .from(otpOrder)
      .innerJoin(user, eq(otpOrder.userId, user.id))
      .orderBy(desc(otpOrder.createdAt))
      .limit(200)
      .catch(() => []),
  ]);
  const proxyOrders = proxyRows.map((o: (typeof proxyRows)[number]) => ({
    ...o,
    type: "proxy" as const,
    currency: "NGN",
    serviceName: `${o.quantity} × ${String(o.proxyType ?? "ipv4").toUpperCase()} proxy · ${o.country} · ${o.period}`,
  }));
  const otpOrders = otpRows.map((o: (typeof otpRows)[number]) => ({
    ...o,
    type: "otp" as const,
    currency: "NGN",
    quantity: 1,
    serviceName: `OTP · ${appLabel(o.app)} · ${appLabel(o.country)}${o.number ? ` · ${o.number}` : ""}`,
  }));

  const allOrders = [
    ...marketplaceOrders.map((o: any) => ({ ...o, userEmail: o.userEmail })),
    ...boostingWithEmail,
    ...proxyOrders,
    ...otpOrders,
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json(allOrders.slice(0, 200));
}
