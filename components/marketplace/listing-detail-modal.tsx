"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useCurrency } from "@/components/currency-provider";
import { PurchaseButton } from "./purchase-button";

interface ListingDetailModalProps {
  listing: {
    slug: string;
    title: string;
    description: string | null;
    price: string;
    currency: string;
    stock: number;
    platform: string;
    categoryName: string | null;
    supplierName: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBalance: string;
}

export function ListingDetailModal({
  listing,
  open,
  onOpenChange,
  userBalance,
}: ListingDetailModalProps) {
  const { format } = useCurrency();
  if (!listing) return null;

  const hasDescription = listing.description?.trim();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader className="text-left">
          <span className="eyebrow text-primary">
            {[listing.platform, listing.categoryName].filter(Boolean).join(" · ")}
          </span>
          <AlertDialogTitle className="text-left text-lg tracking-[-0.02em]">
            {listing.title}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4">
          <p className="subtext max-h-56 overflow-y-auto rounded-xl bg-black/25 p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {hasDescription ? listing.description : "No description"}
          </p>
          <div className="grid grid-cols-2">
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <p className="eyebrow text-muted-foreground">Price</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.02em] tabular-nums">
                {format(parseFloat(listing.price))}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <p className="eyebrow text-muted-foreground">In stock</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.02em] tabular-nums">
                {Math.round(Number(listing.stock)).toLocaleString("en-US")}
              </p>
            </div>
          </div>
          <PurchaseButton
            slug={listing.slug}
            price={listing.price}
            currency={listing.currency}
            stock={listing.stock}
            title={listing.title}
            userBalance={userBalance}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="eyebrow">Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
