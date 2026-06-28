"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/components/currency-provider";
import type { ReallySimpleSocialService } from "@/lib/boosting/really-simple-social";

interface ExtendedService extends ReallySimpleSocialService {
  provider?: string;
}

interface ServiceCardProps {
  service: ExtendedService;
  onViewClick: () => void;
}

export function ServiceCard({ service, onViewClick }: ServiceCardProps) {
  const { format } = useCurrency();
  const min = parseInt(service.min, 10) || 0;
  const max = parseInt(service.max, 10) || 0;
  // rate = NGN price for 1000 quantity. Total = rate × (quantity / 1000).
  const ratePer1000 = parseFloat(service.rate) || 0;
  const fromTotal = ratePer1000 * (min / 1000);

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
          {format(ratePer1000)} per 1000 · Min {min} – Max {max}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {service.refill && "Refill · "}
          {service.cancel && "Cancel"}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-4">
        <span className="text-muted-foreground text-sm">
          from {format(fromTotal)}
        </span>
        <Button size="sm" className="rounded-full" onClick={onViewClick}>
          View
        </Button>
      </CardFooter>
    </Card>
  );
}
