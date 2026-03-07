"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

interface PurchaseButtonProps {
  slug: string;
  price: string;
  currency: string;
  stock: number;
  title: string;
  userBalance: string;
}

export function PurchaseButton({
  slug,
  price,
  currency,
  stock,
  title,
  userBalance,
}: PurchaseButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const totalNgn = parseFloat(price) * quantity;
  const balance = parseFloat(userBalance);
  const canAfford = balance >= totalNgn;
  const outOfStock = stock < 1;

  async function handlePurchase() {
    if (!canAfford || stock < quantity) return;
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingSlug: slug, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Purchase failed");
        return;
      }
      toast.success("Order placed! Check your orders for delivery.");
      setOpen(false);
      router.refresh();
      router.push("/orders");
    } catch {
      toast.error("Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="lg"
        className="w-full rounded-full"
        disabled={outOfStock}
        onClick={() => setOpen(true)}
      >
        {outOfStock ? "Out of stock" : "Buy now"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm purchase</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re about to buy: {title}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="qty" className="text-sm font-medium">
                Quantity
              </label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={stock}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Math.min(stock, parseInt(e.target.value, 10) || 1)))
                }
                className="rounded-lg"
              />
            </div>
            <div className="text-sm">
              <p>
                Total: <strong>₦{Math.round(totalNgn).toLocaleString("en-NG")}</strong>
              </p>
              <p className="text-muted-foreground">
                Your balance: ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {!canAfford && (
                  <span className="text-destructive block">
                    Insufficient balance. Fund your wallet first.
                  </span>
                )}
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading || !canAfford || quantity > stock}
              onClick={(e) => {
                e.preventDefault();
                handlePurchase();
              }}
            >
              {loading ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={16}
                    className="mr-2 size-4 animate-spin"
                  />
                  Processing...
                </>
              ) : (
                `Pay ₦${Math.round(totalNgn).toLocaleString("en-NG")}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
