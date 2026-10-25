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
  /** Small label on the card, e.g. "Featured" or "Best seller". */
  badge?: string;
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
  badge,
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
        {badge && (
          <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[0.6875rem] font-medium text-primary">
            {badge}
          </span>
        )}
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

/**
 * The same listing as a compact row, for list view: icon, title and meta on
 * the left, stock and price on the right. The whole row opens the detail sheet.
 */
export function ListingRow({
  title,
  price,
  stock,
  platform,
  categoryName,
  icon,
  onViewClick,
}: ListingCardProps) {
  const { format } = useCurrency();
  const inStock = Math.round(Number(stock));
  const low = inStock > 0 && inStock <= 5;

  return (
    <button
      type="button"
      onClick={onViewClick}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 hover:bg-white/[0.045] sm:gap-4"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] [&>*]:size-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[0.8125rem] leading-snug font-medium sm:line-clamp-1">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground capitalize">
          {platform.toLowerCase()}
          {categoryName ? ` · ${categoryName}` : ""}
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums sm:flex">
        <span className={low ? "size-1.5 rounded-full bg-amber-400" : "size-1.5 rounded-full bg-emerald-400"} />
        {inStock.toLocaleString("en-US")} in stock
      </span>
      <div className="w-24 shrink-0 text-right">
        <p className="text-[0.8125rem] font-semibold tabular-nums">{format(parseFloat(price))}</p>
        <p className="text-[0.6875rem] text-muted-foreground tabular-nums sm:hidden">
          {inStock.toLocaleString("en-US")} left
        </p>
      </div>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-[#ff9a4a] group-hover:opacity-100"
      />
    </button>
  );
}
