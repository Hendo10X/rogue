"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useCurrency } from "@/components/currency-provider";
import type { ReallySimpleSocialService } from "@/lib/boosting/really-simple-social";

interface ExtendedService extends ReallySimpleSocialService {
  provider?: string;
}

interface ServiceCardProps {
  service: ExtendedService;
  icon?: React.ReactNode;
  onViewClick: () => void;
}

/** One row in the boosting list. The whole row opens the order sheet. */
export function ServiceCard({ service, icon, onViewClick }: ServiceCardProps) {
  const { format } = useCurrency();
  const min = parseInt(service.min, 10) || 0;
  const max = parseInt(service.max, 10) || 0;
  // rate = NGN price for 1000 quantity. Total = rate × (quantity / 1000).
  const ratePer1000 = parseFloat(service.rate) || 0;
  const flags = [
    service.type !== "Default" ? service.type : null,
    service.refill ? "Refill" : null,
    service.cancel ? "Cancel" : null,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={onViewClick}
      className="group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors duration-200 hover:bg-white/[0.045]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] [&_img]:size-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[0.8125rem] font-medium">{service.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{service.category}</span>
          {flags.map((f) => (
            <span key={f} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[0.6875rem]">
              {f}
            </span>
          ))}
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-xs text-muted-foreground tabular-nums">
          {min.toLocaleString()} – {max.toLocaleString()}
        </p>
      </div>
      <div className="w-24 shrink-0 text-right">
        <p className="text-[0.8125rem] font-semibold tabular-nums">{format(ratePer1000)}</p>
        <p className="text-[0.6875rem] text-muted-foreground">per 1,000</p>
      </div>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-[#ff9a4a] group-hover:opacity-100"
      />
    </button>
  );
}
