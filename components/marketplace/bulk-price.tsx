"use client";

import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/components/currency-provider";
import { cn } from "@/lib/utils";
import type { BulkPricing } from "@/lib/bulk-pricing";

/** The admin's bulk discount rule (null while loading or when it's off). */
export function useBulkPricing(): BulkPricing | null {
  const { data } = useQuery<BulkPricing>({
    queryKey: ["bulk-pricing"],
    queryFn: () => fetch("/api/marketplace/bulk-pricing").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
  return data?.enabled ? data : null;
}

/**
 * "₦900 each for 10+" under a listing's normal price. `bulkPrice` comes from
 * the server (it knows the log's cost; a log whose bulk price would reach its
 * cost gets null and shows nothing).
 */
export function BulkPrice({ bulkPrice, stock, className }: { bulkPrice?: number | null; stock?: number; className?: string }) {
  const cfg = useBulkPricing();
  const { format } = useCurrency();
  if (!cfg || bulkPrice == null || !(bulkPrice > 0) || (stock !== undefined && stock < cfg.minQty)) return null;
  return (
    <span className={cn("text-[0.6875rem] font-medium text-emerald-400 tabular-nums", className)}>
      {format(bulkPrice)} each for {cfg.minQty}+
    </span>
  );
}
