"use client";

import { useState } from "react";
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
import type { ReallySimpleSocialService } from "@/lib/boosting/really-simple-social";

interface ExtendedService extends ReallySimpleSocialService {
  provider?: string;
}

interface ServiceOrderModalProps {
  service: ExtendedService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBalance: string;
  onSuccess?: () => void;
}

export function ServiceOrderModal({
  service,
  open,
  onOpenChange,
  userBalance,
  onSuccess,
}: ServiceOrderModalProps) {
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  if (!service) return null;

  const min = parseInt(service.min, 10) || 1;
  const max = parseInt(service.max, 10) || 10000;
  const rate = parseFloat(service.rate) || 0;
  const qty = Math.max(min, Math.min(max, parseInt(quantity, 10) || min));
  const total = (rate * qty).toFixed(2);
  const balance = parseFloat(userBalance);
  const canAfford = balance >= parseFloat(total);

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
          provider: service.provider ?? "rss",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Order failed");
        return;
      }
      toast.success("Order placed! Check your orders.");
      onOpenChange(false);
      setLink("");
      setQuantity("");
      onSuccess?.();
    } catch {
      toast.error("Order failed");
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
            ₦{Math.round(rate).toLocaleString("en-NG")}/unit · Min {min} – Max{" "}
            {max}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="link">Link</Label>
            <Input
              id="link"
              placeholder="https://instagram.com/username"
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
                ₦{Math.round(parseFloat(total)).toLocaleString("en-NG")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Your balance</p>
              <p className="font-medium">
                ₦{Math.round(parseFloat(userBalance)).toLocaleString("en-NG")}
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
              `Order ₦${Math.round(parseFloat(total)).toLocaleString("en-NG")}`
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
