"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPriceWithCurrency } from "@/lib/format-price";
import type { ReallySimpleSocialService } from "@/lib/boosting/really-simple-social";

interface ServiceCardProps {
  service: ReallySimpleSocialService;
  onViewClick: () => void;
}

export function ServiceCard({ service, onViewClick }: ServiceCardProps) {
  const min = parseInt(service.min, 10) || 0;
  const max = parseInt(service.max, 10) || 0;
  const rate = parseFloat(service.rate) || 0;

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {service.category}
          </Badge>
          {service.type !== "Default" && (
            <Badge variant="outline" className="text-xs">
              {service.type}
            </Badge>
          )}
        </div>
        <h3 className="line-clamp-2 font-semibold leading-tight">
          {service.name}
        </h3>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-muted-foreground text-sm">
          ₦{rate.toLocaleString()}/unit · Min {min} – Max {max}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {service.refill && "Refill · "}
          {service.cancel && "Cancel"}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-4">
        <span className="text-muted-foreground text-sm">
          from {formatPriceWithCurrency(rate * min)}
        </span>
        <Button size="sm" className="rounded-full" onClick={onViewClick}>
          View
        </Button>
      </CardFooter>
    </Card>
  );
}
