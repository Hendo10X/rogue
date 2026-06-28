"use client";

import { useCurrency } from "@/components/currency-provider";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Distinct currency codes we can render (the map has a couple of aliases).
const OPTIONS = Array.from(
  new Set(Object.values(SUPPORTED_CURRENCIES).map((c) => c.code)),
);

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency, rates } = useCurrency();
  // Only offer currencies we actually have a live rate for.
  const available = OPTIONS.filter((c) => c === "NGN" || rates[c]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className ?? "rounded-full"}
        >
          {currency}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-display min-w-28">
        {available.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setCurrency(code)}
            className="cursor-pointer"
          >
            <span className="mr-2">{SUPPORTED_CURRENCIES[code]?.symbol}</span>
            {code}
            {code === currency ? (
              <span className="text-muted-foreground ml-auto text-xs">●</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
