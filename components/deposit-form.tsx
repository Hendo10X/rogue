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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

type PaymentProvider = "korapay" | "flutterwave" | "plisio" | "manual";

const KORAPAY_SCRIPT_URL =
  "https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js";
const FLUTTERWAVE_SCRIPT_URL = "https://checkout.flutterwave.com/v3.js";

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
    FlutterwaveCheckout?: (config: {
      public_key: string;
      tx_ref: string;
      amount: number;
      currency: string;
      payment_options?: string;
      customer: { email: string; name: string };
      customizations?: { title: string; description: string };
      callback: (data: { status: string; transaction_id: number; tx_ref: string }) => void;
      onclose: () => void;
    }) => void;
  }
}

const PAYMENT_OPTIONS: { value: PaymentProvider; label: string }[] = [
  { value: "korapay", label: "Card & Bank Transfer (Korapay)" },
  { value: "flutterwave", label: "Card & Bank Transfer (Flutterwave)" },
  { value: "plisio", label: "Crypto — USDT, BTC, ETH (Plisio)" },
  { value: "manual", label: "Manual Bank Transfer" },
];

export function DepositForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("korapay");
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (provider === "korapay") {
      if (document.querySelector(`script[src="${KORAPAY_SCRIPT_URL}"]`)) return;
      const script = document.createElement("script");
      script.src = KORAPAY_SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
    if (provider === "flutterwave") {
      if (document.querySelector(`script[src="${FLUTTERWAVE_SCRIPT_URL}"]`)) return;
      const script = document.createElement("script");
      script.src = FLUTTERWAVE_SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  }, [provider]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    const isNaira = provider === "korapay" || provider === "flutterwave";
    if (!Number.isFinite(num) || num < 1) {
      toast.error(isNaira ? "Enter a valid amount (min 1 NGN)" : "Enter a valid amount (min $1)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          currency: isNaira ? "NGN" : "USDT",
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
            toast.success("Payment successful! Confirming deposit...");
            setTimeout(() => {
              router.refresh();
              router.push("/wallet/deposit/success");
            }, 3000);
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

      if (data.provider === "flutterwave") {
        if (!window.FlutterwaveCheckout) {
          toast.error("Payment gateway loading... Please try again.");
          setLoading(false);
          return;
        }
        window.FlutterwaveCheckout({
          public_key: data.publicKey,
          tx_ref: data.orderNumber,
          amount: data.amount,
          currency: "NGN",
          payment_options: "card,banktransfer,ussd",
          customer: data.customer,
          customizations: {
            title: "Rogue Socials",
            description: "Wallet deposit",
          },
          callback: (response) => {
            if (response.status === "successful") {
              toast.success("Payment successful! Confirming deposit...");
              setTimeout(() => {
                router.refresh();
                router.push("/wallet/deposit/success");
              }, 3000);
            } else {
              toast.error("Payment failed. Please try again.");
              setLoading(false);
            }
          },
          onclose: () => {
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment method</label>
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v as PaymentProvider)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider === "manual" ? (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Bank Transfer Details</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name</span>
                  <span className="font-medium">Rogue Socials Marketplace</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-mono font-semibold tracking-wider">4005379809</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">Moniepoint MFB</span>
                </div>
              </div>
              <p className="text-muted-foreground text-xs pt-1 border-t">
                After payment, send your receipt to our support on{" "}
                <a
                  href="https://t.me/rogue4l"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline">
                  Telegram
                </a>{" "}
                for manual crediting.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">
                  Amount ({provider === "plisio" ? "USD" : "NGN"})
                </label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  max={10000000}
                  step={provider === "plisio" ? 0.01 : 1}
                  placeholder={provider === "plisio" ? "50" : "1000"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="rounded-lg"
                />
                <p className="text-muted-foreground text-xs">
                  {provider === "plisio"
                    ? "Pay with USDT, BTC, ETH, etc."
                    : "Pay with card or bank transfer (Naira)"}
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
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
