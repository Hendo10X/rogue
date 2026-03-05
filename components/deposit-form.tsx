"use client";

import { useState } from "react";
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

export function DepositForm() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num < 1) {
      toast.error("Enter a valid amount (min $1)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num, currency: "USDT" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create deposit");
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
            onClick={() => window.location.href = invoiceUrl}>
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
          Enter the amount in USD. You&apos;ll pay with crypto (USDT, BTC, ETH,
          etc.).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount (USD)
            </label>
            <Input
              id="amount"
              type="number"
              min={1}
              max={100000}
              step={0.01}
              placeholder="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="rounded-lg"
            />
            <p className="text-muted-foreground text-xs">
              Min $1, max $100,000
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
