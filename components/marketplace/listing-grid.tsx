"use client";

import { useQuery } from "@tanstack/react-query";
import { ListingCard } from "./listing-card";
import { ListingDetailModal } from "./listing-detail-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon } from "@hugeicons/core-free-icons";

function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="#1877F2" d="M36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 8.978 6.578 16.406 15.188 17.781V23.25h-4.5v-5.25h4.5v-4.032c0-4.437 2.64-6.884 6.671-6.884 1.933 0 3.957.346 3.957.346v4.352h-2.23c-2.196 0-2.881 1.362-2.881 2.76v3.458h4.896l-.782 5.25h-4.114v12.531C29.422 34.406 36 26.978 36 18z"/>
      <path fill="#ffffff" d="M24.205 23.25l.782-5.25h-4.896v-3.458c0-1.398.685-2.76 2.881-2.76h2.23v-4.352s-2.024-.346-3.957-.346c-4.032 0-6.671 2.447-6.671 6.884v4.032h-4.5v5.25h4.5v12.531a18.156 18.156 0 005.626 0V23.25h4.005z"/>
    </svg>
  );
}

function PlatformSvgIcon({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="size-5 shrink-0 rounded-sm" />;
}

function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase();

  if (p.includes("instagram")) return <PlatformSvgIcon src="/svgs/instagram-icon.svg" alt="Instagram" />;
  if (p.includes("tiktok")) return <PlatformSvgIcon src="/svgs/tiktok-icon-dark.svg" alt="TikTok" />;
  if (p.includes("telegram")) return <PlatformSvgIcon src="/svgs/telegram.svg" alt="Telegram" />;
  if (p.includes("whatsapp")) return <PlatformSvgIcon src="/svgs/whatsapp-icon.svg" alt="WhatsApp" />;
  if (p.includes("messenger")) return <PlatformSvgIcon src="/svgs/messenger.svg" alt="Messenger" />;
  if (p.includes("threads")) return <PlatformSvgIcon src="/svgs/threads.svg" alt="Threads" />;
  if (p.includes("twitter") || p.includes(" x ") || p === "x") return <PlatformSvgIcon src="/svgs/x.svg" alt="X" />;
  if (p.includes("facebook")) return <FacebookLogo className="size-5 shrink-0" />;

  if (p.includes("dating")) return <HugeiconsIcon icon={FavouriteIcon} className="text-rose-500 fill-rose-500" size={20} />;
  if (p.includes("vpn")) return <span className="text-base leading-none">🔒</span>;
  if (p.includes("spotify") || p.includes("music")) return <span className="text-base leading-none">🎵</span>;
  if (p.includes("youtube")) return <span className="text-base leading-none">▶️</span>;
  if (p.includes("snapchat") || p.includes("snap")) return <span className="text-base leading-none">👻</span>;
  if (p.includes("discord")) return <span className="text-base leading-none">💬</span>;
  if (p.includes("linkedin")) return <span className="text-base leading-none">💼</span>;
  if (p.includes("gmail") || p.includes("email") || p.includes("mail")) return <span className="text-base leading-none">📧</span>;
  if (p.includes("netflix") || p.includes("streaming")) return <span className="text-base leading-none">🎬</span>;
  if (p.includes("gaming") || p.includes("game")) return <span className="text-base leading-none">🎮</span>;

  if (p.includes("usa")) return <span className="text-base leading-none">🇺🇸</span>;
  if (p.includes("uk")) return <span className="text-base leading-none">🇬🇧</span>;
  if (p.includes("vietnam")) return <span className="text-base leading-none">🇻🇳</span>;
  if (p.includes("philippines")) return <span className="text-base leading-none">🇵🇭</span>;
  if (p.includes("indonesia")) return <span className="text-base leading-none">🇮🇩</span>;
  if (p.includes("thailand")) return <span className="text-base leading-none">🇹🇭</span>;
  if (p.includes("india")) return <span className="text-base leading-none">🇮🇳</span>;
  if (p.includes("brazil")) return <span className="text-base leading-none">🇧🇷</span>;
  if (p.includes("colombia")) return <span className="text-base leading-none">🇨🇴</span>;
  if (p.includes("mexico")) return <span className="text-base leading-none">🇲🇽</span>;
  if (p.includes("nigeria")) return <span className="text-base leading-none">🇳🇬</span>;
  if (p.includes("germany")) return <span className="text-base leading-none">🇩🇪</span>;
  if (p.includes("france")) return <span className="text-base leading-none">🇫🇷</span>;
  if (p.includes("italy")) return <span className="text-base leading-none">🇮🇹</span>;
  if (p.includes("spain")) return <span className="text-base leading-none">🇪🇸</span>;
  if (p.includes("canada")) return <span className="text-base leading-none">🇨🇦</span>;
  if (p.includes("australia")) return <span className="text-base leading-none">🇦🇺</span>;

  return null;
}

async function fetchListings(params: {
  page?: number;
  platform?: string;
  platformGroup?: string;
  category?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.platform) searchParams.set("platform", params.platform);
  if (params.platformGroup) searchParams.set("platformGroup", params.platformGroup);
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
  const [primaryPlatform, setPrimaryPlatform] = useState("");
  const [facebookCategory, setFacebookCategory] = useState("");
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);

  const userBalance =
    walletBalance.find((w) => w.currency === "NGN")?.balance ?? "0";

  function openListingModal(item: ListingItem) {
    setSelectedListing(item);
    setModalOpen(true);
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["listings", page, primaryPlatform, facebookCategory, debouncedSearch],
    queryFn: () => {
      const platformParams: { platform?: string; platformGroup?: string } = {};
      if (primaryPlatform === "facebook") {
        if (facebookCategory) platformParams.platform = facebookCategory;
        else platformParams.platformGroup = "facebook";
      } else if (primaryPlatform) {
        platformParams.platform = primaryPlatform;
      }
      return fetchListings({ page, ...platformParams, search: debouncedSearch || undefined });
    },
  });

  const platforms: string[] = data?.platforms ?? [];
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const facebookPlatforms = platforms.filter((p) => p.toLowerCase().includes("facebook"));
  const otherPlatforms = platforms.filter((p) => !p.toLowerCase().includes("facebook"));

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
          <Select
            value={primaryPlatform || "all"}
            onValueChange={(val) => {
              setPrimaryPlatform(val === "all" ? "" : val);
              setFacebookCategory("");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[180px] rounded-lg bg-background">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {facebookPlatforms.length > 0 && (
                <SelectItem value="facebook">
                  <div className="flex items-center gap-2">
                    <FacebookLogo className="size-4 shrink-0" />
                    <span className="uppercase">Facebook</span>
                  </div>
                </SelectItem>
              )}
              {otherPlatforms.map((p) => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-2">
                    <div className="flex size-5 items-center justify-center shrink-0">
                      {getPlatformIcon(p)}
                    </div>
                    <span className="uppercase">{p}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {primaryPlatform === "facebook" && facebookPlatforms.length > 0 && (
            <Select
              value={facebookCategory || "all"}
              onValueChange={(val) => {
                setFacebookCategory(val === "all" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[280px] rounded-lg bg-background border-primary/50 text-primary">
                <SelectValue placeholder="All Facebook Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facebook Categories</SelectItem>
                {facebookPlatforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    <div className="flex items-center gap-2">
                      <div className="flex size-5 items-center justify-center shrink-0">
                        {getPlatformIcon(p)}
                      </div>
                      <span className="uppercase">{p}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
