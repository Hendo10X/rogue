"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useCurrency } from "@/components/currency-provider";
import { SpotlightCard } from "@/components/ui/spotlight-card";
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
        <p className="line-clamp-2 text-[0.8125rem] leading-snug font-medium sm:line-clamp-1">{service.name}</p>
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

/**
 * The same service as a card, for grid view: category and flags up top, the
 * name, then the per-1,000 price and order range. The whole card opens the
 * order sheet.
 */
export function ServiceTile({ service, icon, onViewClick }: ServiceCardProps) {
  const { format } = useCurrency();
  const min = parseInt(service.min, 10) || 0;
  const max = parseInt(service.max, 10) || 0;
  const ratePer1000 = parseFloat(service.rate) || 0;
  const flags = [
    service.type !== "Default" ? service.type : null,
    service.refill ? "Refill" : null,
    service.cancel ? "Cancel" : null,
  ].filter(Boolean) as string[];

  return (
    <SpotlightCard
      as="button"
      type="button"
      onClick={onViewClick}
      className="flex min-h-48 flex-col gap-4 p-5 text-left hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] [&_img]:size-[18px]">
          {icon}
        </span>
        <p className="min-w-0 truncate text-xs text-muted-foreground">{service.category}</p>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="line-clamp-2 text-[0.9375rem] leading-snug font-medium tracking-[-0.015em]">{service.name}</h3>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {flags.map((f) => (
              <span key={f} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[0.6875rem] text-muted-foreground">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold tracking-[-0.03em] tabular-nums">{format(ratePer1000)}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            per 1,000 · {min.toLocaleString()}–{max.toLocaleString()}
          </span>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-muted-foreground transition-all duration-300 group-hover/spot:bg-[linear-gradient(100deg,#ff4d1a,#ffa51a)] group-hover/spot:text-white">
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 transition-transform duration-300 group-hover/spot:translate-x-0.5" />
        </span>
      </div>
    </SpotlightCard>
  );
}
