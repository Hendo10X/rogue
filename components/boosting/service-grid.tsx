"use client";

import { useQuery } from "@tanstack/react-query";
import { ServiceCard } from "./service-card";
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
import { useState } from "react";
import type { ReallySimpleSocialService } from "@/lib/boosting/really-simple-social";

function getCategoryIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes("instagram")) return <img src="/svgs/instagram-icon.svg" alt="" className="size-4 shrink-0 rounded-sm" />;
  if (c.includes("tiktok")) return <img src="/svgs/tiktok-icon-dark.svg" alt="" className="size-4 shrink-0 rounded-sm" />;
  if (c.includes("telegram")) return <img src="/svgs/telegram.svg" alt="" className="size-4 shrink-0 rounded-sm" />;
  if (c.includes("whatsapp")) return <img src="/svgs/whatsapp-icon.svg" alt="" className="size-4 shrink-0 rounded-sm" />;
  if (c.includes("threads")) return <img src="/svgs/threads.svg" alt="" className="size-4 shrink-0 rounded-sm" />;
  if (c.includes("facebook")) return <img src="/svgs/facebook-icon.svg" alt="" className="size-4 shrink-0 rounded-sm" />;
  if (c.includes("twitter") || c.includes(" x ") || c === "x") return <img src="/svgs/x.svg" alt="" className="size-4 shrink-0 rounded-sm" />;
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

const EMPTY_WALLET: { balance: string; currency: string }[] = [];

interface ServiceGridProps {
  walletBalance?: { balance: string; currency: string }[];
}

export function ServiceGrid({
  walletBalance = EMPTY_WALLET,
}: ServiceGridProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedService, setSelectedService] =
    useState<ReallySimpleSocialService | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["boosting-services", page, search, category],
    queryFn: () =>
      fetchServices({
        page,
        limit: 50,
        q: search,
        category: category === "all" ? "" : category,
      }),
  });

  const items = data?.items ?? [];
  const categories = data?.categories ?? [];
  const pagination = data?.pagination;

  const userBalance =
    walletBalance.find((w) => w.currency === "NGN")?.balance ?? "0";

  function openModal(service: ReallySimpleSocialService) {
    setSelectedService(service);
    setModalOpen(true);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load services"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search services..."
          value={search}
          onChange={handleSearchChange}
          className="max-w-xs rounded-lg"
        />
        <Select
          value={category}
          onValueChange={(val) => {
            setCategory(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[220px] rounded-lg bg-background">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
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

      <div className={isLoading ? "opacity-60 pointer-events-none" : ""}>
        {items.length === 0 && !isLoading ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              No services found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((service: ReallySimpleSocialService) => (
              <ServiceCard
                key={service.service}
                service={service}
                onViewClick={() => openModal(service)}
              />
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full">
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full">
            Next
          </Button>
        </div>
      )}

      <ServiceOrderModal
        service={selectedService}
        open={modalOpen}
        onOpenChange={setModalOpen}
        userBalance={userBalance}
      />
    </>
  );
}
