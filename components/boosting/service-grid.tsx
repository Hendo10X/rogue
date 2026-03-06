"use client";

import { useQuery } from "@tanstack/react-query";
import { ServiceCard } from "./service-card";
import { ServiceOrderModal } from "./service-order-modal";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ReallySimpleSocialService } from "@/lib/boosting/really-simple-social";

async function fetchServices(params: { 
  page?: number; 
  limit?: number; 
  q?: string; 
  category?: string 
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
    queryFn: () => fetchServices({ 
      page, 
      limit: 50, 
      q: search, 
      category: category === "all" ? "" : category 
    }),
  });

  const items = data?.items ?? [];
  const categories = data?.categories ?? [];
  const pagination = data?.pagination;

  const userBalance =
    walletBalance.find((w) => w.currency === "USDT")?.balance ?? "0";

  function openModal(service: ReallySimpleSocialService) {
    setSelectedService(service);
    setModalOpen(true);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCategory(e.target.value);
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-full border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={category}
            onChange={handleCategoryChange}
            className="w-full rounded-full border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Categories</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={isLoading ? "opacity-60 pointer-events-none" : ""}>
        {items.length === 0 && !isLoading ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">No services found matching your criteria.</p>
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
            className="rounded-full"
          >
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
            className="rounded-full"
          >
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
