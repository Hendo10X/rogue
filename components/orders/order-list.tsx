"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { formatPriceWithCurrency } from "@/lib/format-price";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  Calendar03Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

interface Order {
  id: string;
  status: string;
  amount: string;
  currency: string;
  quantity: number;
  createdAt: string;
  title: string;
  platform: string;
  slug: string;
  supplierName: string;
  deliveryStatus: string;
  deliveredAt: string | null;
  credentials: string[];
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    completed: "bg-green-500/15 text-green-600 dark:text-green-400",
    failed: "bg-red-500/15 text-red-600 dark:text-red-400",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="secondary" className={variants[status] ?? ""}>
      {label}
    </Badge>
  );
}

function CredentialsBlock({ credentials }: { credentials: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = credentials.join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (credentials.length === 0) return null;
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground font-medium">Credentials</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={copy}
        >
          <HugeiconsIcon
            icon={Copy01Icon}
            size={14}
            className={copied ? "text-green-500" : ""}
          />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-all font-mono text-xs">
        {text}
      </pre>
    </div>
  );
}

function OrderViewSheet({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!order) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="line-clamp-2">{order.title}</SheetTitle>
          <SheetDescription>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <Badge variant="outline">{order.platform}</Badge>
              <span className="text-xs">
                {new Date(order.createdAt).toLocaleDateString()} · Qty:{" "}
                {order.quantity}
              </span>
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 py-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">{order.supplierName}</p>
            <p className="text-xl font-semibold">
              {formatPriceWithCurrency(order.amount, order.currency)}
            </p>
          </div>
          {(order.status === "completed" || order.status === "failed") && (
            <CredentialsBlock credentials={order.credentials} />
          )}
        </div>
        <SheetFooter className="flex-row gap-2 sm:flex-row">
          <SheetClose asChild>
            <Button variant="outline" className="rounded-full">
              Close
            </Button>
          </SheetClose>
          <Button asChild className="rounded-full">
            <Link href={`/marketplace/${order.slug}`}>
              View listing
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

async function fetchOrders() {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export function OrderList({ initialOrders }: { initialOrders: Order[] }) {
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: orders = initialOrders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    initialData: initialOrders,
    refetchInterval: 10000,
  });

  function openOrderView(o: Order) {
    setViewOrder(o);
    setSheetOpen(true);
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4 text-center">
            No orders yet. Browse the marketplace to make your first purchase.
          </p>
          <Button asChild className="rounded-full">
            <Link href="/marketplace">
              Browse marketplace
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {orders.map((o: Order) => (
          <Card key={o.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={o.status} />
                  <Badge variant="outline" className="text-xs">
                    {o.platform}
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs">
                  <HugeiconsIcon icon={Calendar03Icon} size={12} className="mr-1 inline" />
                  {new Date(o.createdAt).toLocaleDateString()}
                </span>
              </div>
              <CardTitle className="text-base">
                <button
                  type="button"
                  onClick={() => openOrderView(o)}
                  className="hover:text-link text-left hover:underline text-link"
                >
                  {o.title}
                </button>
              </CardTitle>
              <CardDescription className="text-xs">
                {o.supplierName} · Qty: {o.quantity}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {formatPriceWithCurrency(o.amount, o.currency)}
                </span>
                {(o.status === "processing" || o.status === "pending") && (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Spinner className="size-3" />
                    Processing...
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => openOrderView(o)}
                >
                  View
                </Button>
              </div>
              {(o.status === "completed" || o.status === "failed") && (
                <CredentialsBlock credentials={o.credentials} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <OrderViewSheet
        order={viewOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
