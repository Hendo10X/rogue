"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useCurrency } from "@/components/currency-provider";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

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
      callback: (data: { status: string; transaction_id: number; tx_ref: string; flw_ref: string }) => void;
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

const METHOD_COPY: Record<PaymentProvider, [string, string]> = {
  korapay: ["Korapay", "Card, bank transfer or USSD · NGN"],
  flutterwave: ["Flutterwave", "Card or bank transfer · NGN"],
  plisio: ["Plisio", "Crypto — USDT, BTC, ETH · USD"],
  manual: ["Manual transfer", "Pay into our account, send the receipt"],
};

export function DepositForm() {
  const router = useRouter();
  const { currency, convert } = useCurrency();
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("korapay");
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  // Naira providers settle in NGN; show the equivalent in the visitor's
  // currency so international customers know what they're paying.
  const enteredNgn = parseFloat(amount);
  const showEquivalent =
    (provider === "korapay" || provider === "flutterwave") &&
    currency !== "NGN" &&
    Number.isFinite(enteredNgn) &&
    enteredNgn > 0;

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
          callback: async (response) => {
            if (response.status === "successful") {
              toast.success("Payment received! Crediting your wallet...");
              try {
                const verifyRes = await fetch("/api/wallet/deposit/flutterwave-verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    transaction_id: response.transaction_id,
                    tx_ref: response.tx_ref,
                  }),
                });
                const verifyData = await verifyRes.json();
                if (verifyRes.ok) {
                  toast.success("Wallet credited successfully!");
                  router.refresh();
                  router.push("/wallet/deposit/success");
                } else {
                  toast.error(verifyData.error ?? "Payment received but crediting failed. Contact support.");
                  setLoading(false);
                }
              } catch {
                toast.error("Payment received but couldn't confirm. Contact support if balance isn't updated.");
                setLoading(false);
              }
            } else {
              toast.error("Payment was not completed. Please try again.");
              setLoading(false);
            }
          },
          onclose: () => {
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
      <div className="surface rounded-2xl px-5 py-6">
        <p className="mt-2 text-sm text-muted-foreground">
          Taking you to the payment page…
        </p>
        <Button
          className="mt-5 w-full"
          variant="outline"
          onClick={() => (window.location.href = invoiceUrl)}>
          Open payment page
        </Button>
      </div>
    );
  }

  const isUsd = provider === "plisio";
  const presets = isUsd ? [10, 25, 50, 100] : [2000, 5000, 10000, 25000];

  return (
    <form onSubmit={handleSubmit} className="surface flex flex-col gap-5 rounded-3xl p-5 sm:p-6">
      <span className="text-sm font-medium">Payment method</span>
      <div role="radiogroup" aria-label="Payment method" className="grid gap-2 sm:grid-cols-2">
        {PAYMENT_OPTIONS.map((opt) => {
          const on = provider === opt.value;
          const [name, detail] = METHOD_COPY[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setProvider(opt.value)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]",
                on
                  ? "ring-rogue bg-[linear-gradient(140deg,rgb(255_90_31/0.14),rgb(255_211_26/0.04))]"
                  : "bg-white/[0.03] hover:bg-white/[0.055]"
              )}
            >
              <span
                className={cn(
                  "flex size-[18px] shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  on ? "bg-rogue-gradient" : "shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.2)]"
                )}
              >
                <span className={cn("size-1.5 rounded-full bg-white transition-transform duration-200", on ? "scale-100" : "scale-0")} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-medium">{name}</span>
                <span className="block text-xs text-muted-foreground">{detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {provider === "manual" ? (
        <div className="flex flex-col">
          <dl className="grid gap-2 sm:grid-cols-3">
            {[
              ["Account name", "Rogue Socials Marketplace"],
              ["Account number", "4005379809"],
              ["Bank", "Moniepoint MFB"],
            ].map(([term, value]) => (
              <div key={term} className="rounded-2xl bg-white/[0.03] px-4 py-3.5">
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd
                  className={cn(
                    "mt-1.5 text-xs font-medium",
                    term === "Account number" && "font-mono text-sm tracking-wider"
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="py-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
            Pay the exact amount to the account above. Then tap the button
            below to send your payment receipt to us on Telegram — we&apos;ll
            credit your wallet manually.
          </p>
          <div>
            <Button asChild size="lg" className="w-full">
              <a
                href="https://t.me/rogue4l"
                target="_blank"
                rel="noopener noreferrer">
                I have paid — send receipt
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col gap-3">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount ({isUsd ? "USD" : "NGN"})
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-muted-foreground">
                {isUsd ? "$" : "₦"}
              </span>
              <Input
                id="amount"
                type="number"
                min={1}
                max={10000000}
                step={isUsd ? 0.01 : 1}
                placeholder={isUsd ? "50" : "1000"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                className="h-14 rounded-2xl pl-9 text-2xl font-semibold tracking-[-0.03em] tabular-nums md:text-2xl"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={cn(
                    "h-8 rounded-full px-3.5 text-[0.8125rem] tabular-nums transition-all duration-200 active:scale-95",
                    amount === String(v)
                      ? "bg-[#ff7a1a]/15 text-[#ffc08f] shadow-[inset_0_0_0_1px_rgb(255_140_60/0.4)]"
                      : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground"
                  )}
                >
                  {isUsd ? `$${v}` : `₦${v.toLocaleString()}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {isUsd ? "Pay with USDT, BTC, ETH, etc." : "Pay with card or bank transfer (Naira)"}
              {showEquivalent && (
                <> · ≈ {formatMoney(convert(enteredNgn), currency)} at today&apos;s rate</>
              )}
            </p>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={16} className="size-4 animate-spin" />
                  Creating payment…
                </>
              ) : (
                "Continue to payment"
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
