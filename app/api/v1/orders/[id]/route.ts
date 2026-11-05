import { NextRequest, NextResponse } from "next/server";
import { toApiAmount } from "@/lib/currency";
import { db } from "@/db/drizzle";
import { boostingOrder } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { authenticateApiRequest, ApiErrors } from "@/lib/api-auth";
import { refreshBoostingOrder } from "@/lib/boosting/refresh";

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

  // Refresh from the supplier (best-effort); refunds failed/partial orders.
  const fresh = await refreshBoostingOrder(row).catch(() => row);
  // API contract: a failed order reads "cancelled".
  const status = fresh.status === "failed" || fresh.status === "refunded" ? "cancelled" : fresh.status;
  const externalStatus = fresh.externalStatus;
  const remains = fresh.remains;
  const startCount = fresh.startCount;

  return NextResponse.json({
    data: {
      id: row.id,
      service: row.serviceId,
      service_name: row.serviceName,
      link: row.link,
      quantity: row.quantity,
      charge: toApiAmount(row.amount),
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
