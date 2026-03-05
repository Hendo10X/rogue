"use client";

import { useQuery } from "@tanstack/react-query";
import { ListingCard } from "./listing-card";
import { ListingDetailModal } from "./listing-detail-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useState, useEffect } from "react";
async function fetchListings(params: {
  page?: number;
  platform?: string;
  category?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.platform) searchParams.set("platform", params.platform);
  if (params.category) searchParams.set("category", params.category);
  if (params.search) searchParams.set("search", params.search);
  const res = await fetch(`/api/marketplace/listings?${searchParams}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch");
  return data;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface ListingItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: string;
  currency: string;
  stock: number;
  platform: string;
  categoryName: string | null;
  supplierName: string;
}

const EMPTY_WALLET: { balance: string; currency: string }[] = [];

interface ListingGridProps {
  walletBalance?: { balance: string; currency: string }[];
}

export function ListingGrid({ walletBalance = EMPTY_WALLET }: ListingGridProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);

  const userBalance =
    walletBalance.find((w) => w.currency === "USDT")?.balance ?? "0";

  function openListingModal(item: ListingItem) {
    setSelectedListing(item);
    setModalOpen(true);
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["listings", page, platform, debouncedSearch],
    queryFn: () =>
      fetchListings({ page, platform: platform || undefined, search: debouncedSearch || undefined }),
  });

  const platforms: string[] = data?.platforms ?? [];
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search listings..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            className="max-w-xs rounded-lg"
          />
          <select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setPage(1);
            }}
            className="border-input bg-background h-9 max-w-xs rounded-lg border px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : (data?.error ?? "Failed to load listings. Sync suppliers first.")}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No listings yet. Contact support if you need products added.
          </p>
        </div>
      ) : (
        <>
          <div className={isLoading ? "opacity-60 pointer-events-none" : ""}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item: Record<string, unknown>) => {
                const listing: ListingItem = {
                  id: String(item.id),
                  slug: String(item.slug),
                  title: String(item.title),
                  description: item.description as string | null,
                  price: String(item.price),
                  currency: String(item.currency),
                  stock: Number(item.stock),
                  platform: String(item.platform),
                  categoryName: (item.categoryName as string) ?? null,
                  supplierName: String(item.supplierName),
                };
                return (
                  <ListingCard
                    key={listing.id}
                    {...listing}
                    onViewClick={() => openListingModal(listing)}
                  />
                );
              })}
            </div>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
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
        </>
      )}
      <ListingDetailModal
        listing={selectedListing}
        open={modalOpen}
        onOpenChange={setModalOpen}
        userBalance={userBalance}
      />
    </div>
  );
}
