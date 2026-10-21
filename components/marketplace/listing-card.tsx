"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useCurrency } from "@/components/currency-provider";
import { SpotlightCard } from "@/components/ui/spotlight-card";

interface ListingCardProps {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: string;
  currency: string;
  stock: number;
  platform: string;
  categoryName: string | null;
  supplierName: string;
  icon?: React.ReactNode;
  onViewClick: () => void;
}

/** A listing as a spotlight card: the whole card opens the detail sheet. */
export function ListingCard({
  title,
  description,
  price,
  stock,
  platform,
  categoryName,
  icon,
  onViewClick,
}: ListingCardProps) {
  const hasDescription = description?.trim();
  const { format } = useCurrency();
  const inStock = Math.round(Number(stock));
  const low = inStock > 0 && inStock <= 5;

  return (
    <SpotlightCard
      as="button"
      type="button"
      onClick={onViewClick}
      className="flex min-h-52 flex-col gap-4 p-5 text-left hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] [&>*]:size-[18px]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground/80 capitalize">{platform.toLowerCase()}</p>
          {categoryName && <p className="truncate text-xs text-muted-foreground">{categoryName}</p>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="line-clamp-2 text-[0.9375rem] leading-snug font-medium tracking-[-0.015em]">{title}</h3>
        <p className="line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {hasDescription ? description : "No description"}
        </p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold tracking-[-0.03em] tabular-nums">{format(parseFloat(price))}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <span className={low ? "size-1.5 rounded-full bg-amber-400" : "size-1.5 rounded-full bg-emerald-400"} />
            {inStock.toLocaleString("en-US")} in stock
          </span>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.05] text-muted-foreground transition-all duration-300 group-hover/spot:bg-[linear-gradient(100deg,#ff4d1a,#ffa51a)] group-hover/spot:text-white">
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 transition-transform duration-300 group-hover/spot:translate-x-0.5" />
        </span>
      </div>
    </SpotlightCard>
  );
}
