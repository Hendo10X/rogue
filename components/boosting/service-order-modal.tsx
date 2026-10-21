"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useCurrency } from "@/components/currency-provider";
import type { SociallyService } from "@/lib/boosting/socially";

interface ExtendedService extends SociallyService {
  provider?: string;
}

interface ServiceOrderModalProps {
  service: ExtendedService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBalance: string;
  onSuccess?: () => void;
}

function friendlyError(msg?: string): string {
  if (!msg) return "Order failed. Your wallet has been refunded.";
  const m = msg.toLowerCase();
  if (m.includes("503") || m.includes("service unavailable") || m.includes("temporarily"))
    return "The service is temporarily unavailable. Please try again in a few minutes.";
  if (m.includes("insufficient balance") || m.includes("not enough balance"))
    return "This service is currently unavailable. Please try again later or contact support.";
  if (m.includes("invalid link") || m.includes("incorrect link") || m.includes("wrong link"))
    return "The link you entered is invalid. Please check and try again.";
  if (m.includes("invalid service") || m.includes("service not found"))
    return "This service is no longer available. Please choose a different one.";
  if (m.includes("unauthorized") || m.includes("invalid key"))
    return "Service configuration error. Please contact support.";
  if (m.includes("insufficient") || m.includes("balance"))
    return "Insufficient wallet balance. Please fund your wallet and try again.";
  if (m.includes("timeout") || m.includes("timed out"))
    return "The request timed out. Please try again.";
  // Strip any "Socially.ng:" or "API error" prefixes before showing
  return msg.replace(/^(socially\.ng:|api error\s*\d*:?\s*)/i, "").trim() || "Order failed. Please try again.";
}

export function ServiceOrderModal({
  service,
  open,
  onOpenChange,
  userBalance,
  onSuccess,
}: ServiceOrderModalProps) {
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  // When service changes, pre-fill quantity with min so initial total (rate × min) shows
  useEffect(() => {
    if (service) {
      const min = parseInt(service.min, 10) || 1;
      setQuantity(String(min));
    }
  }, [service?.service, service?.min]);

  if (!service) return null;

  const min = parseInt(service.min, 10) || 1;
  const max = parseInt(service.max, 10) || 10000;
  const ratePer1000 = Number((parseFloat(service.rate) || 0).toFixed(2));
  const qty = Math.max(min, Math.min(max, parseInt(quantity, 10) || min));
  const total = Number((ratePer1000 * (qty / 1000)).toFixed(2));
  const balance = parseFloat(userBalance);
  const canAfford = balance >= total;

  async function handleOrder() {
    if (!service) return;
    if (!link.trim()) {
      toast.error("Enter the link");
      return;
    }
    if (!canAfford) {
      toast.error("Insufficient balance. Fund your wallet first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/boosting/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.service,
          link: link.trim(),
          quantity: qty,
          provider: service.provider ?? "socially",
        }),
      });
      const text = await res.text();
      let data: { error?: string; orderId?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        // Non-JSON response (e.g. HTML error page)
      }
      if (res.ok) {
        toast.success("Order placed! Check your orders.");
        onOpenChange(false);
        setLink("");
        setQuantity("");
        onSuccess?.();
        void queryClient.invalidateQueries({ queryKey: ["orders"] });
        void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
        return;
      }
      toast.error(friendlyError(data.error));
    } catch {
      toast.warning("Network issue. Check your orders — it may have gone through.");
      onSuccess?.();
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader className="text-left">
          <span className="eyebrow text-primary">
            {service.category}
            {service.type !== "Default" ? ` · ${service.type}` : ""}
          </span>
          <AlertDialogTitle className="text-left leading-snug">
            {service.name}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-xs">
            {format(ratePer1000)} per 1,000 · min {min.toLocaleString()} – max {max.toLocaleString()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="link" className="eyebrow text-muted-foreground">Link</Label>
            <Input
              id="link"
              placeholder="Paste your profile or post link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quantity" className="eyebrow text-muted-foreground">Quantity</Label>
              <div className="flex gap-1.5">
                {[min, Math.min(max, 1000), Math.min(max, 5000)]
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setQuantity(String(v))}
                      className={
                        qty === v
                          ? "h-7 rounded-full bg-[#ff7a1a]/15 px-3 text-xs text-[#ffc08f] shadow-[inset_0_0_0_1px_rgb(255_140_60/0.4)]"
                          : "h-7 rounded-full bg-white/[0.04] px-3 text-xs text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                      }
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
              </div>
            </div>
            <Input
              id="quantity"
              type="number"
              min={min}
              max={max}
              placeholder={`${min} - ${max}`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-10 tabular-nums"
            />
          </div>
          <div className="grid grid-cols-2">
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <p className="eyebrow text-muted-foreground">Total</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.02em] tabular-nums">
                {format(total)}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <p className="eyebrow text-muted-foreground">Your balance</p>
              <p
                className={
                  canAfford
                    ? "mt-2 text-lg font-semibold tracking-[-0.02em] tabular-nums"
                    : "mt-2 text-lg font-semibold tracking-[-0.02em] text-destructive tabular-nums"
                }
              >
                {format(parseFloat(userBalance))}
              </p>
              {!canAfford && (
                <p className="subtext text-[0.6875rem] text-destructive">Insufficient balance</p>
              )}
            </div>
          </div>
          <Button
            size="lg"
            className="eyebrow h-11 w-full"
            disabled={loading || !link.trim() || !canAfford}
            onClick={handleOrder}>
            {loading ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={16}
                  className="size-4 animate-spin"
                />
                Placing order…
              </>
            ) : (
              `Order · ${format(total)}`
            )}
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="eyebrow">Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
