"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPriceWithCurrency } from "@/lib/format-price";

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
  onViewClick: () => void;
}

export function ListingCard({
  title,
  description,
  price,
  currency,
  stock,
  platform,
  categoryName,
  supplierName,
  onViewClick,
}: ListingCardProps) {
  const hasDescription = description?.trim();
  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {platform}
          </Badge>
          {categoryName && (
            <Badge variant="outline" className="text-xs">
              {categoryName}
            </Badge>
          )}
        </div>
        <h3 className="line-clamp-2 font-semibold leading-tight">
          <button
            type="button"
            onClick={onViewClick}
            className="hover:text-link text-left hover:underline text-link"
          >
            {title}
          </button>
        </h3>
        <p className="text-muted-foreground text-xs">{supplierName}</p>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {hasDescription ? description : "No description"}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-4">
        <span className="font-semibold">
          {formatPriceWithCurrency(price, currency)}
        </span>
        <span className="text-muted-foreground text-xs">
          {stock} in stock
        </span>
        <Button size="sm" className="rounded-full" onClick={onViewClick}>
          View
        </Button>
      </CardFooter>
    </Card>
  );
}
