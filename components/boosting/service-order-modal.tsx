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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
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
          <AlertDialogTitle className="text-left">
            {service.name}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-xs">
            ₦{ratePer1000.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per 1000 · Min {min} – Max {max}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="link">Link</Label>
            <Input
              id="link"
              placeholder="Paste your profile or post link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={min}
              max={max}
              placeholder={`${min} - ${max}`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="text-lg font-semibold">
                ₦{total.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Your balance</p>
              <p className="font-medium">
                ₦{parseFloat(userBalance).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {!canAfford && (
                <p className="text-destructive text-xs">Insufficient balance</p>
              )}
            </div>
          </div>
          <Button
            size="lg"
            className="w-full rounded-full"
            disabled={loading || !link.trim() || !canAfford}
            onClick={handleOrder}>
            {loading ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={16}
                  className="mr-2 size-4 animate-spin"
                />
                Placing order...
              </>
            ) : (
              `Order ₦${total.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
