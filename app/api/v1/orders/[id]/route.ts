import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { boostingOrder } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { authenticateApiRequest, ApiErrors } from "@/lib/api-auth";
import * as socially from "@/lib/boosting/socially";

export const dynamic = "force-dynamic";

// GET /api/v1/orders/:id — live status of one of the API user's orders.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  const { id } = await params;
  const [row] = await db
    .select()
    .from(boostingOrder)
    .where(and(eq(boostingOrder.id, id), eq(boostingOrder.userId, auth.userId)))
    .limit(1);

  if (!row) return ApiErrors.notFound("Order not found");

  // Refresh status from the supplier when we have an external id (best-effort).
  let status = row.status;
  let externalStatus = row.externalStatus;
  let remains = row.remains;
  let startCount = row.startCount;
  if (row.externalOrderId) {
    try {
      const live = await socially.getOrderStatus(row.externalOrderId);
      if (live.status) externalStatus = live.status;
      if (live.remains != null) remains = String(live.remains);
      if (live.start_count != null) startCount = String(live.start_count);
      const lowered = live.status?.toLowerCase() ?? "";
      if (lowered.includes("completed")) status = "completed";
      else if (lowered.includes("cancel") || lowered.includes("refund")) status = "cancelled";
      else if (lowered.includes("partial")) status = "partial";

      db.update(boostingOrder)
        .set({ status, externalStatus, remains, startCount, updatedAt: new Date() })
        .where(eq(boostingOrder.id, row.id))
        .catch(() => {});
    } catch {
      /* fall back to stored values */
    }
  }

  return NextResponse.json({
    data: {
      id: row.id,
      service: row.serviceId,
      service_name: row.serviceName,
      link: row.link,
      quantity: row.quantity,
      charge: row.amount,
      currency: row.currency,
      status,
      external_status: externalStatus,
      external_order_id: row.externalOrderId,
      start_count: startCount,
      remains,
      created_at: row.createdAt,
    },
  });
}
