"use client";

import { mentions2fa } from "@/lib/totp";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import { useCurrency } from "@/components/currency-provider";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  ArrowRight01Icon,
  PackageIcon,
  Rocket01Icon,
  Globe02Icon,
  SmartPhone01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  type?: "marketplace" | "boosting" | "proxy" | "otp";
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
  deliveredAt?: string | null;
  credentials: string[];
}

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300 bg-amber-400/10",
  processing: "text-sky-300 bg-sky-400/10",
  completed: "text-emerald-300 bg-emerald-400/10",
  failed: "text-red-300 bg-red-400/10",
  manual_review: "text-violet-300 bg-violet-400/10",
};

function StatusBadge({ status }: { status: string }) {
  const label = status === "manual_review" ? "Manual review" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[0.6875rem] font-medium",
        STATUS_TONE[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function CredentialsBlock({ credentials }: { credentials: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = credentials.join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Login details copied.");
    setTimeout(() => setCopied(false), 2000);
  };

  if (credentials.length === 0) return null;
  return (
    <div className="rounded-xl bg-black/25">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Credentials</span>
        <Button variant="ghost" size="xs"  onClick={copy}>
          <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={12} className={copied ? "text-emerald-400" : ""} />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-48 overflow-y-auto px-3 py-2.5 font-mono text-[0.6875rem] leading-relaxed break-all whitespace-pre-wrap">
        {text}
      </pre>
      {mentions2fa(text) && (
        <a
          href="/tools/2fa"
          className="flex items-center justify-between gap-2 rounded-b-xl bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/15"
        >
          This log uses 2FA. Get the login code in Tools → 2FA codes
          <span aria-hidden>→</span>
        </a>
      )}
    </div>
  );
}

function OrderViewModal({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { format } = useCurrency();
  if (!order) return null;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="line-clamp-2 leading-snug">{order.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <span className="subtext text-xs">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="mt-2 text-lg font-semibold tabular-nums">{format(parseFloat(order.amount))}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="mt-2 text-lg font-semibold tabular-nums">{order.quantity.toLocaleString()}</p>
          </div>
        </div>
        {(order.status === "completed" || order.status === "failed") && (
          <CredentialsBlock credentials={order.credentials} />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel >Close</AlertDialogCancel>
          {order.slug ? (
            <AlertDialogAction asChild >
              <Link href={`/marketplace/${order.slug}`}>
                View listing
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Link>
            </AlertDialogAction>
          ) : (
            <AlertDialogAction >OK</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

async function fetchOrders() {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

type Filter = "all" | "marketplace" | "boosting" | "proxy" | "otp";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "marketplace", label: "Accounts" },
  { id: "boosting", label: "Boosting" },
  { id: "proxy", label: "Proxies" },
  { id: "otp", label: "OTP" },
];

/** Orders without a type are marketplace orders (older rows). */
function kindOf(o: { type?: string }): Filter {
  return o.type === "boosting" || o.type === "proxy" || o.type === "otp" ? o.type : "marketplace";
}

export function OrderList({ initialOrders }: { initialOrders: Order[] }) {
  const { format } = useCurrency();
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const { data: orders = initialOrders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    initialData: initialOrders,
    refetchInterval: 10000,
  });

  function openOrderView(o: Order) {
    setViewOrder(o);
    setModalOpen(true);
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center surface rounded-2xl">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 surface rounded-2xl px-6 py-16 text-center">
        <div>
          <p className="text-sm font-medium">No orders yet.</p>
          <p className="subtext mt-1 text-xs text-muted-foreground">
            Browse the marketplace to make your first purchase.
          </p>
        </div>
        <Button asChild >
          <Link href="/marketplace">
            Browse marketplace
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Link>
        </Button>
      </div>
    );
  }

  const counts = {
    all: orders.length,
    marketplace: orders.filter((o: Order) => kindOf(o) === "marketplace").length,
    boosting: orders.filter((o: Order) => kindOf(o) === "boosting").length,
    proxy: orders.filter((o: Order) => kindOf(o) === "proxy").length,
    otp: orders.filter((o: Order) => kindOf(o) === "otp").length,
  };
  const visible = orders.filter((o: Order) => filter === "all" || kindOf(o) === filter);

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        id="orders"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({ value: f.id, label: f.label, count: counts[f.id] }))}
        className="self-start"
      />

      {visible.length === 0 ? (
        <div className="surface rounded-2xl px-6 py-12 text-center">
          <p className="text-[0.8125rem] text-muted-foreground">No orders in this view.</p>
        </div>
      ) : (
        <ul className="surface flex flex-col gap-0.5 rounded-2xl p-1.5">
          <AnimatePresence initial={false}>
            {visible.map((o: Order) => {
              const busy = o.status === "processing" || o.status === "pending" || o.status === "manual_review";
              const showCreds = (o.status === "completed" || o.status === "failed") && o.credentials.length > 0;
              return (
                <motion.li
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() => openOrderView(o)}
                    className="group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.045]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-muted-foreground transition-colors group-hover:text-[#ff9a4a]">
                      <HugeiconsIcon icon={o.type === "boosting" ? Rocket01Icon : o.type === "proxy" ? Globe02Icon : o.type === "otp" ? SmartPhone01Icon : PackageIcon} strokeWidth={1.75} className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[0.8125rem] font-medium">{o.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {o.platform} · qty {o.quantity.toLocaleString()} · {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      {busy && <Spinner className="size-3 text-muted-foreground" />}
                      <StatusBadge status={o.status} />
                    </div>
                    <span className="w-24 text-right text-[0.8125rem] font-semibold tabular-nums">
                      {format(parseFloat(o.amount))}
                    </span>
                  </button>
                  {showCreds && (
                    <div className="px-3 pb-3 sm:pl-[4.25rem]">
                      <CredentialsBlock credentials={o.credentials} />
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      <OrderViewModal order={viewOrder} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
