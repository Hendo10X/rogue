"use client";

import { useQuery } from "@tanstack/react-query";
import { ServiceCard } from "./service-card";
import { ServiceOrderModal } from "./service-order-modal";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ReallySimpleSocialService } from "@/lib/boosting/really-simple-social";

async function fetchServices(params: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const res = await fetch(`/api/boosting/services?${searchParams}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to fetch services");
  }
  return res.json();
}

interface ServiceGridProps {
  walletBalance?: { balance: string; currency: string }[];
}

export function ServiceGrid({
  walletBalance = [],
}: ServiceGridProps) {
  const [page, setPage] = useState(1);
  const [selectedService, setSelectedService] =
    useState<ReallySimpleSocialService | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["boosting-services", page],
    queryFn: () => fetchServices({ page, limit: 24 }),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const userBalance =
    walletBalance.find((w) => w.currency === "USDT")?.balance ?? "0";

  function openModal(service: ReallySimpleSocialService) {
    setSelectedService(service);
    setModalOpen(true);
  }

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
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

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No services available.</p>
      </div>
    );
  }

  return (
    <>
      <div className={isLoading ? "opacity-60 pointer-events-none" : ""}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((service: ReallySimpleSocialService) => (
            <ServiceCard
              key={service.service}
              service={service}
              onViewClick={() => openModal(service)}
            />
          ))}
        </div>
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
