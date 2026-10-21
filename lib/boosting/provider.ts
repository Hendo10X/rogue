import * as rss from "./really-simple-social";
import * as socially from "./socially";
import * as rp from "./reseller-provider";

/**
 * The boosting supplier every NEW order goes to. Switching suppliers is a
 * one-line change here; orders already placed keep using the supplier that
 * fulfilled them (see `supplierForOrder`), so their status checks stay correct.
 */
export const ACTIVE_SUPPLIER = "rss" as const;
export const ACTIVE_SUPPLIER_NAME = "ReallySimpleSocial";

/** `boosting_order.provider` value for website orders on the active supplier. */
export const WEBSITE_PROVIDER = ACTIVE_SUPPLIER;
/** `boosting_order.provider` value for reseller-API orders on the active supplier. */
export const API_PROVIDER = `api:${ACTIVE_SUPPLIER}`;

export type BoostingService = rss.ReallySimpleSocialService;

export const fetchServices = rss.fetchServices;
export const addOrder = rss.addOrder;
export const getBalance = rss.getBalance;

type Supplier = "rss" | "socially" | "rp";

/**
 * Which supplier fulfilled an existing order, from its stored `provider`:
 * - "rss" / "api:rss" → ReallySimpleSocial
 * - "socially" and plain "api" → Socially.ng (orders from before the switch)
 * - "rp" → reseller provider
 */
export function supplierForOrder(provider: string | null | undefined): Supplier {
  const p = (provider ?? "").toLowerCase();
  if (p === "rp") return "rp";
  if (p === "socially" || p === "api") return "socially";
  if (p.startsWith("api:")) return (p.slice(4) as Supplier) || "rss";
  return "rss";
}

/** Live status of an order from the supplier that actually fulfilled it. */
export async function getOrderStatus(
  provider: string | null | undefined,
  externalOrderId: number
): Promise<rss.OrderStatusResponse> {
  switch (supplierForOrder(provider)) {
    case "socially":
      return socially.getOrderStatus(externalOrderId);
    case "rp":
      return rp.getOrderStatus(externalOrderId);
    default:
      return rss.getOrderStatus(externalOrderId);
  }
}
