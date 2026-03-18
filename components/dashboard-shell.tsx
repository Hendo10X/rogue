"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AccountSetting01Icon,
  Add01Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Information,
  Logout01Icon,
  Menu01Icon,
  Notification03Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatPriceWithCurrency } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { authClient } from "@/utils/auth-client";

interface DashboardShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  walletBalance: { balance: string; currency: string }[];
  children: React.ReactNode;
}

const DASHBOARD_LINKS = [
  { title: "Overview", href: "/dashboard", icon: Notification03Icon },
  { title: "Marketplace", href: "/marketplace", icon: CheckmarkBadge01Icon },
  { title: "Orders", href: "/orders", icon: Wallet01Icon },
  { title: "Wallet", href: "/wallet/deposit", icon: Add01Icon },
  { title: "Settings", href: "/settings", icon: AccountSetting01Icon },
  {
    title: "Support",
    href: "https://t.me/fynixlogs",
    icon: Information,
    external: true,
  },
] as const;

export function DashboardShell({ user, walletBalance, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="h-screen overflow-hidden bg-background font-display">
      <div className="flex h-full">
        {/* Sidebar - desktop */}
        <aside className="hidden h-full w-64 flex-col border-r border-purple-500/10 bg-[#05011c]/90 px-4 py-6 md:flex">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3">
            <Image
              src="/Fynixlogs.svg"
              alt="Fynix Logs"
              width={222}
              height={85}
              className="h-14 w-auto"
            />
          </Link>

          <nav className="flex-1 space-y-1">
            {DASHBOARD_LINKS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              const content = (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    "text-purple-200/50 hover:bg-purple-500/10 hover:text-purple-100",
                    isActive &&
                      "bg-purple-500/15 text-purple-50 shadow-[0_0_25px_rgba(147,51,234,0.35)]",
                  )}
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    size={18}
                    className="size-[18px] text-purple-300/80"
                  />
                  <span>{item.title}</span>
                </div>
              );

              if ("external" in item && item.external) {
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <Link key={item.title} href={item.href}>
                  {content}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <HugeiconsIcon icon={Logout01Icon} size={16} className="size-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Content + top bar */}
        <div className="flex h-full flex-1 flex-col">
          <header className="flex items-center border-b border-purple-500/10 bg-[#05021a]/95 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 md:hidden">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="hover:bg-purple-500/10 hover:text-purple-100"
                  >
                    <HugeiconsIcon
                      icon={Menu01Icon}
                      size={18}
                      className="size-[18px]"
                    />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  showCloseButton
                  closeButtonSize="lg"
                  className="w-[260px] border-purple-500/20 bg-[#05011c]/95 font-display sm:max-w-xs"
                >
                  <SheetHeader>
                    <SheetTitle>
                      <Link
                        href="/dashboard"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2"
                      >
                        <Image
                          src="/Fynixlogs.svg"
                          alt="Fynix Logs"
                          width={222}
                          height={85}
                          className="h-9 w-auto"
                        />
                      </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 space-y-1">
                    {DASHBOARD_LINKS.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" &&
                          pathname.startsWith(item.href));

                      const content = (
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            "text-purple-200/60 hover:bg-purple-500/10 hover:text-purple-100",
                            isActive &&
                              "bg-purple-500/15 text-purple-50 shadow-[0_0_22px_rgba(147,51,234,0.4)]",
                          )}
                        >
                          <HugeiconsIcon
                            icon={item.icon}
                            size={18}
                            className="size-[18px] text-purple-300/80"
                          />
                          <span>{item.title}</span>
                        </div>
                      );

                      if ("external" in item && item.external) {
                        return (
                          <Link
                            key={item.title}
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setSidebarOpen(false)}
                          >
                            {content}
                          </Link>
                        );
                      }

                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" className="flex items-center">
                <Image
                  src="/Fynixlogs.svg"
                  alt="Fynix Logs"
                  width={180}
                  height={69}
                  className="h-10 w-auto"
                />
              </Link>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/wallet/deposit")}
                className="hidden items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-600/30 px-3 py-1.5 text-xs font-medium text-purple-50 shadow-[0_0_18px_rgba(147,51,234,0.5)] transition hover:bg-purple-600/50 md:inline-flex"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} className="size-[14px]" />
                Fund wallet
              </button>

              <div className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-950/40 px-2 py-1">
                <Avatar className="size-8">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="bg-purple-900 text-xs font-medium text-purple-100">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col text-xs sm:flex">
                  <span className="font-medium text-purple-50">{user.name}</span>
                  <span className="text-purple-300/50">{user.email}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#05021a] pb-10 pt-6 md:pt-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

