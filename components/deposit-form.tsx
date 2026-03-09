"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PaymentProvider = "plisio" | "korapay";

const KORAPAY_SCRIPT_URL =
  "https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js";

declare global {
  interface Window {
    Korapay?: {
      initialize: (config: {
        key: string;
        reference: string;
        amount: number;
        currency?: string;
        customer: { name: string; email: string };
        notification_url?: string;
        onSuccess?: (data: { amount: string; reference: string; status: string }) => void;
        onFailed?: (data: unknown) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

export function DepositForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("korapay");
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (provider !== "korapay") return;
    if (document.querySelector(`script[src="${KORAPAY_SCRIPT_URL}"]`)) return;
    const script = document.createElement("script");
    script.src = KORAPAY_SCRIPT_URL;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [provider]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num < 1) {
      toast.error(provider === "korapay" ? "Enter a valid amount (min 1 NGN)" : "Enter a valid amount (min $1)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          currency: provider === "korapay" ? "NGN" : "USDT",
          provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create deposit");
        return;
      }

      if (data.provider === "korapay") {
        if (!window.Korapay) {
          toast.error("Payment gateway loading... Please try again.");
          return;
        }
        window.Korapay.initialize({
          key: data.publicKey,
          reference: data.orderNumber,
          amount: data.amount,
          currency: "NGN",
          customer: data.customer,
          notification_url: data.notificationUrl,
          onSuccess: () => {
            toast.success("Payment successful!");
            router.refresh();
            router.push("/wallet/deposit/success");
          },
          onFailed: () => {
            toast.error("Payment failed. Please try again.");
            setLoading(false);
          },
          onClose: () => {
            router.refresh();
            setLoading(false);
          },
        });
        return;
      }

      setInvoiceUrl(data.invoiceUrl);
      toast.success("Payment link created. Redirecting...");
      window.location.href = data.invoiceUrl;
    } catch {
      toast.error("Failed to create deposit");
    } finally {
      setLoading(false);
    }
  }

  if (invoiceUrl) {
    return (
      <Card className="shadow-none">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center text-sm">
            Redirecting to payment...
          </p>
          <Button
            className="mt-4 w-full rounded-full"
            variant="outline"
            onClick={() => (window.location.href = invoiceUrl)}>
            Open payment page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Deposit amount</CardTitle>
        <CardDescription>
          Choose your payment method and enter the amount.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setProvider("korapay")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                provider === "korapay"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              Card & Bank (Korapay)
            </button>
            <button
              type="button"
              onClick={() => setProvider("plisio")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                provider === "plisio"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              Crypto (Plisio)
            </button>
          </div>
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount ({provider === "korapay" ? "NGN" : "USD"})
            </label>
            <Input
              id="amount"
              type="number"
              min={1}
              max={10000000} // Increased max for NGN
              step={provider === "korapay" ? 1 : 0.01}
              placeholder={provider === "korapay" ? "1000" : "50"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="rounded-lg"
            />
            <p className="text-muted-foreground text-xs">
              {provider === "korapay"
                ? "Pay with card or bank transfer (Naira)"
                : "Pay with USDT, BTC, ETH, etc."}
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full">
            {loading ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={16}
                  className="mr-2 size-4 animate-spin"
                />
                Creating payment...
              </>
            ) : (
              "Continue to payment"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
