import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { boostingOrder, user } from "@/db/schema";
import { getBoostingPricer } from "@/lib/boosting/profit";
import { getOrCreateWallet, debitWallet, creditWallet, logTransaction } from "@/lib/wallet";
import * as boosting from "@/lib/boosting/provider";
import { getHiddenServiceIds } from "@/lib/boosting/hidden";
import { boostingMin } from "@/lib/boosting/min";
import { fail, type OrderResult } from "@/lib/order-result";

export type BoostingOrderInput = { serviceId: number; link: string; quantity: number };
export type BoostingOrderPlaced = { orderId: string; externalOrderId: number; amount: string; message: string };

/** A service's ₦ price for a quantity, clamped to its min/max (what the order will charge). */
export async function quoteBoosting(serviceId: number, quantity: number) {
  const [services, hidden, pricer] = await Promise.all([boosting.fetchServices(), getHiddenServiceIds(), getBoostingPricer()]);
  const service = services.find((s) => s.service === serviceId);
  if (!service || hidden.has(serviceId)) return null;
  const min = boostingMin(service);
  const max = parseInt(service.max, 10) || 10000;
  const qty = Math.max(min, Math.min(max, quantity));
  const rateNgnPer1000 = pricer.sellRate(service.service, service.rate);
  return { service, min, max, qty, rateNgnPer1000, totalNgn: Number((rateNgnPer1000 * (qty / 1000)).toFixed(2)) };
}

/**
 * Places a boosting order for a user: re-prices on the server, charges the
 * wallet, orders from the supplier, and refunds if anything after the charge
 * fails. Used by the website (/api/boosting/order) and the Telegram bot.
 */
export async function placeBoostingOrder(userId: string, input: BoostingOrderInput): Promise<OrderResult<BoostingOrderPlaced>> {
  const { serviceId, link, quantity } = input;
  // Every new order goes to the active supplier, whatever the client sent.
  const provider = boosting.WEBSITE_PROVIDER;
  if (!serviceId || !link?.trim() || !quantity || quantity < 1) {
    return fail(400, "serviceId, link, and quantity are required");
  }

  const services = await boosting.fetchServices();
  const service = services.find((s) => s.service === serviceId);
  if (!service) return fail(404, "Service not found");

  const hiddenServices = await getHiddenServiceIds();
  if (hiddenServices.has(serviceId)) return fail(404, "This service is no longer available.");

  const min = boostingMin(service);
  const max = parseInt(service.max, 10) || 10000;
  const qty = Math.max(min, Math.min(max, quantity));

  // Same price the storefront showed: supplier rate + per-service profit or global markup.
  const pricer = await getBoostingPricer();
  // The supplier returns rates already in NGN — no USD conversion needed
  const rateNgnPer1000 = pricer.sellRate(service.service, service.rate);
  const totalAmountNgn = Number((rateNgnPer1000 * (qty / 1000)).toFixed(2));

  const walletRow = await getOrCreateWallet(userId, "NGN");
  const balance = parseFloat(walletRow.balance);
  if (balance + 0.01 < totalAmountNgn) {
    console.log(`[Boosting] Insufficient: balance=${balance}, total=${totalAmountNgn}, rate=${rateNgnPer1000}, qty=${qty}`);
    return fail(400, `Insufficient balance (₦${balance.toFixed(2)} < ₦${totalAmountNgn.toFixed(2)}). Fund your wallet first.`);
  }

  try {
    await debitWallet(walletRow.id, totalAmountNgn.toFixed(2), "NGN");
  } catch {
    return fail(400, "Failed to debit wallet. Try again.");
  }

  const refund = async (reason: string, extra: Record<string, unknown> = {}) => {
    try {
      await creditWallet(walletRow.id, totalAmountNgn.toFixed(2), "NGN");
      await logTransaction({
        walletId: walletRow.id,
        type: "refund",
        amount: totalAmountNgn.toFixed(2),
        currency: "NGN",
        status: "completed",
        metadata: { reason, ...extra },
      });
    } catch (refundErr) {
      console.error(`[Boosting] Refund failed (${reason}):`, refundErr);
    }
  };

  let externalOrderId: number;
  try {
    const result = await boosting.addOrder({ service: serviceId, link: link.trim(), quantity: qty });
    const orderIdFromApi = result?.order;
    if (orderIdFromApi == null || (typeof orderIdFromApi === "number" && orderIdFromApi <= 0)) {
      throw new Error("Supplier did not accept the order. Please check the link and try again.");
    }
    externalOrderId = Number(orderIdFromApi);
  } catch (e) {
    console.error("[Boosting] supplier addOrder failed:", e);
    // Refund so the user is not charged on failure.
    await refund("boosting_order_supplier_failed");
    const raw = e instanceof Error ? e.message : "";
    // Pass the clean supplier error through — the client translates it to friendly text.
    console.error("[Boosting] Supplier error detail:", raw);
    return fail(502, raw || "Failed to place order with supplier");
  }

  const orderId = crypto.randomUUID();
  try {
    await db.insert(boostingOrder).values({
      id: orderId,
      userId,
      walletId: walletRow.id,
      serviceId,
      serviceName: service.name,
      category: service.category,
      link: link.trim(),
      quantity: qty,
      amount: totalAmountNgn.toFixed(2),
      currency: "NGN",
      externalOrderId,
      provider,
      status: "processing",
      externalStatus: "In progress",
    });
  } catch (e) {
    // Supplier accepted + wallet debited, but we failed to persist the order.
    // Refund to avoid charging the user for an untracked order.
    await refund("boosting_order_internal_failed", { externalOrderId, provider });
    console.error("[Boosting] Saving order failed:", e);
    return fail(500, "Something went wrong saving your order. Your money has been put back in your wallet.");
  }

  try {
    await logTransaction({
      walletId: walletRow.id,
      type: "order_payment",
      amount: `-${totalAmountNgn.toFixed(2)}`,
      currency: "NGN",
      status: "completed",
      externalReference: String(externalOrderId),
      metadata: { boostingOrderId: orderId, serviceId, serviceName: service.name, provider },
    });
  } catch (e) {
    console.error("[Boosting] Failed to log transaction:", e);
  }

  // Admin + user email notifications (non-critical)
  try {
    const [usr] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (usr?.email) {
      const { sendAdminOrderNotification, sendBoostingOrderPlacedEmail } = await import("@/lib/email");
      await Promise.allSettled([
        sendAdminOrderNotification({
          orderId,
          orderType: "boosting",
          userEmail: usr.email,
          userName: usr.name,
          amount: totalAmountNgn.toFixed(2),
          currency: "NGN",
          serviceName: service.name,
          quantity: qty,
          status: "processing",
        }),
        sendBoostingOrderPlacedEmail({
          to: usr.email,
          userName: usr.name,
          orderId,
          serviceName: service.name,
          category: service.category,
          link: link.trim(),
          quantity: qty,
          amount: totalAmountNgn.toFixed(2),
          currency: "NGN",
          status: "processing",
        }),
      ]);
    }
  } catch {
    /* non-critical */
  }

  return { ok: true, data: { orderId, externalOrderId, amount: totalAmountNgn.toFixed(2), message: "Order placed successfully." } };
}
