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
import { useCurrency } from "@/components/currency-provider";

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
  const { format } = useCurrency();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const balance = parseFloat(userBalance);
  const outOfStock = stock < 1;

  async function handlePurchase() {
    if (stock < quantity) return;
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
      if (data.status === "completed") {
        toast.success("Purchase successful! Credentials delivered — check your orders.");
      } else {
        toast.info(data.message ?? "Order placed — under review. Check your orders for updates.");
      }
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
        className="eyebrow h-11 w-full"
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="qty" className="eyebrow text-muted-foreground">
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
                className="h-10 tabular-nums"
              />
            </div>
            <div className="grid grid-cols-2">
              <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                <p className="eyebrow text-muted-foreground">Estimated total</p>
                <p className="mt-2 text-base font-semibold tabular-nums">
                  {format(parseFloat(price) * quantity)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                <p className="eyebrow text-muted-foreground">Your balance</p>
                <p
                  className={
                    balance < parseFloat(price) * quantity
                      ? "mt-2 text-base font-semibold text-destructive tabular-nums"
                      : "mt-2 text-base font-semibold tabular-nums"
                  }
                >
                  {format(balance)}
                </p>
              </div>
            </div>
            <p className="subtext text-xs text-muted-foreground">
              Final price is calculated at checkout with the live exchange rate.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading || quantity > stock}
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
                  Processing…
                </>
              ) : (
                "Confirm purchase"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
