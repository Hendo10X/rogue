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
import { Badge } from "@/components/ui/badge";
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
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {listing.platform}
            </Badge>
            {listing.categoryName && (
              <Badge variant="outline" className="text-xs">
                {listing.categoryName}
              </Badge>
            )}
          </div>
          <AlertDialogTitle className="text-left">
            {listing.title}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground whitespace-pre-wrap text-sm">
              {hasDescription ? listing.description : "No description"}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-muted-foreground text-xs">Price</p>
              <p className="text-lg font-semibold">
                {format(parseFloat(listing.price))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">In stock</p>
              <p className="font-medium">{Math.round(Number(listing.stock)).toLocaleString("en-US")}</p>
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
          <AlertDialogCancel className="rounded-full">Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
