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

/** Same rounding as checkout (lib/bulk-pricing.ts). */
export function bulkPrice(unitNgn: number, cfg: BulkPricing): number {
  return Math.round(unitNgn * (1 - cfg.percent / 100));
}

/** "₦900 each for 10+" under a listing's normal price, when bulk pricing is on. */
export function BulkPrice({ price, stock, className }: { price: string | number; stock?: number; className?: string }) {
  const cfg = useBulkPricing();
  const { format } = useCurrency();
  const unit = typeof price === "number" ? price : parseFloat(price);
  if (!cfg || !(unit > 0) || (stock !== undefined && stock < cfg.minQty)) return null;
  return (
    <span className={cn("text-[0.6875rem] font-medium text-emerald-400 tabular-nums", className)}>
      {format(bulkPrice(unit, cfg))} each for {cfg.minQty}+
    </span>
  );
}
