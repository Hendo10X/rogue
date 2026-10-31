"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ServiceCard, ServiceTile } from "./service-card";
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle";
import { ServiceOrderModal } from "./service-order-modal";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import type { ReallySimpleSocialService } from "@/lib/boosting/really-simple-social";

/* eslint-disable @next/next/no-img-element */
function getCategoryIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes("instagram")) return <img src="/svgs/instagram-icon.svg" alt="" className="size-4 shrink-0" />;
  if (c.includes("tiktok")) return <img src="/svgs/tiktok-icon-dark.svg" alt="" className="size-4 shrink-0" />;
  if (c.includes("telegram")) return <img src="/svgs/telegram.svg" alt="" className="size-4 shrink-0" />;
  if (c.includes("whatsapp")) return <img src="/svgs/whatsapp-icon.svg" alt="" className="size-4 shrink-0" />;
  if (c.includes("threads")) return <img src="/svgs/threads.svg" alt="" className="size-4 shrink-0" />;
  if (c.includes("facebook")) return <img src="/svgs/facebook-icon.svg" alt="" className="size-4 shrink-0" />;
  if (c.includes("twitter") || c.includes(" x ") || c === "x") return <img src="/svgs/x.svg" alt="" className="size-4 shrink-0" />;
  if (c.includes("youtube")) return <span className="text-sm leading-none">▶️</span>;
  if (c.includes("spotify") || c.includes("music")) return <span className="text-sm leading-none">🎵</span>;
  if (c.includes("snapchat") || c.includes("snap")) return <span className="text-sm leading-none">👻</span>;
  if (c.includes("discord")) return <span className="text-sm leading-none">💬</span>;
  if (c.includes("linkedin")) return <span className="text-sm leading-none">💼</span>;
  if (c.includes("vpn")) return <span className="text-sm leading-none">🔒</span>;
  if (c.includes("website") || c.includes("traffic") || c.includes("seo")) return <span className="text-sm leading-none">🌐</span>;
  if (c.includes("review")) return <span className="text-sm leading-none">⭐</span>;
  return <span className="text-sm leading-none">📦</span>;
}

async function fetchServices(params: {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.q) searchParams.set("q", params.q);
  if (params.category) searchParams.set("category", params.category);

  const res = await fetch(`/api/boosting/services?${searchParams}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to fetch services");
  }
  return res.json();
}

async function fetchWalletBalance(): Promise<{ balance: string; currency: string }[]> {
  const res = await fetch("/api/wallet/balance");
  if (!res.ok) return [{ balance: "0", currency: "NGN" }];
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

const EMPTY_WALLET: { balance: string; currency: string }[] = [];

interface ServiceGridProps {
  walletBalance?: { balance: string; currency: string }[];
}

export function ServiceGrid({
  walletBalance = EMPTY_WALLET,
}: ServiceGridProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedService, setSelectedService] =
    useState<ReallySimpleSocialService | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useViewMode("boosting", "list");

  // "/" jumps to search from anywhere on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (e.key !== "/" || target?.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Boosting announcement dialog
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState("");

  useEffect(() => {
    fetch("/api/boosting/announcement")
      .then((r) => r.json())
      .then((data) => {
        if (data?.active && data?.message) {
          const dismissedId = sessionStorage.getItem("boosting_announcement_dismissed");
          if (dismissedId !== data.id) {
            setAnnouncementMsg(data.message);
            setAnnouncementOpen(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["boosting-services", page, search, category],
    queryFn: () =>
      fetchServices({
        page,
        limit: 50,
        q: search,
        category: category === "all" ? "" : category,
      }),
  });

  const { data: liveBalance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: fetchWalletBalance,
    initialData: walletBalance,
  });

  const items = data?.items ?? [];
  const categories = data?.categories ?? [];
  const pagination = data?.pagination;

  const currentBalance = (liveBalance ?? walletBalance);
  const userBalance =
    currentBalance.find((w) => w.currency === "NGN")?.balance ?? "0";

  function openModal(service: ReallySimpleSocialService) {
    setSelectedService(service);
    setModalOpen(true);
  }

  function handleOrderSuccess() {
    void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  if (isError) {
    return (
      <div className="surface rounded-2xl px-6 py-16 text-center">
        <p className="subtext text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load services"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Boosting-specific announcement dialog */}
      <AlertDialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">Boosting notice</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {announcementMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="eyebrow"
              onClick={() => {
                // Store dismissed state in sessionStorage so it doesn't re-show this session
                fetch("/api/boosting/announcement")
                  .then((r) => r.json())
                  .then((d) => {
                    if (d?.id) sessionStorage.setItem("boosting_announcement_dismissed", d.id);
                  })
                  .catch(() => {});
                setAnnouncementOpen(false);
              }}
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toolbar — search and category. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex flex-1 items-center">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute left-4 size-4 text-muted-foreground"
          />
          <Input
            ref={searchRef}
            placeholder="Search services…"
            value={search}
            onChange={handleSearchChange}
            className="h-11 rounded-full pr-12 pl-10"
          />
          <kbd className="pointer-events-none absolute right-4 hidden h-5 min-w-5 items-center justify-center rounded-md bg-white/[0.06] px-1.5 font-mono text-[0.625rem] text-muted-foreground sm:inline-flex">
            /
          </kbd>
        </label>
        <Select
          value={category}
          onValueChange={(val) => {
            setCategory(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-11! w-full rounded-full px-4 sm:w-[260px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat: string) => (
              <SelectItem key={cat} value={cat}>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(cat)}
                  <span>{cat}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 pl-1">
        <span className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
          {pagination ? `Page ${page} of ${Math.max(1, pagination.totalPages)}` : "Services"}
          {isFetching && <Spinner className="size-3.5" />}
        </span>
        <ViewToggle id="boosting" value={view} onChange={setView} size="sm" />
      </div>

      <div
        className={
          isLoading || isFetching
            ? "pointer-events-none opacity-50 transition-opacity duration-300"
            : "transition-opacity duration-300"
        }
      >
        {isLoading && items.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center surface rounded-2xl">
            <Spinner className="size-6" />
          </div>
        ) : items.length === 0 ? (
          <div className="surface rounded-2xl px-6 py-16 text-center">
            <p className="text-sm font-medium">No services match that.</p>
            <p className="subtext mt-1 text-xs text-muted-foreground">
              Try another category or a shorter search.
            </p>
          </div>
        ) : (
          <div
            className={
              view === "grid"
                ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                : "surface flex flex-col gap-0.5 rounded-2xl p-1.5"
            }
          >
            {items.map((service: ReallySimpleSocialService) => {
              const Item = view === "grid" ? ServiceTile : ServiceCard;
              return (
                <Item
                  key={service.service}
                  service={service}
                  icon={getCategoryIcon(service.category)}
                  onViewClick={() => openModal(service)}
                />
              );
            })}
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-9 px-4"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            Previous
          </Button>
          <span className="flex items-center px-3 text-[0.8125rem] text-muted-foreground tabular-nums">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 px-4"
          >
            Next
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
        </div>
      )}

      <ServiceOrderModal
        service={selectedService}
        open={modalOpen}
        onOpenChange={setModalOpen}
        userBalance={userBalance}
        onSuccess={handleOrderSuccess}
      />
    </div>
  );
}
