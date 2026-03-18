"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
  AccountSetting01Icon,
  Logout01Icon,
  Menu01Icon,
  Add01Icon,
  Information,
} from "@hugeicons/core-free-icons";
import { authClient } from "@/utils/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatPriceWithCurrency } from "@/lib/format-price";

interface DashboardNavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  walletBalance: { balance: string; currency: string }[];
  logoUrl?: string;
  logoSrc?: string;
}

const NAV_LINKS = [
  { title: "Marketplace", url: "/marketplace" },
  { title: "Orders", url: "/orders" },
  { title: "Support", url: "https://t.me/fynixlogs" },
];

export function DashboardNavbar({
  user,
  walletBalance,
  logoUrl = "/dashboard",
  logoSrc = "/Fynixlogs.svg",
}: DashboardNavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const primaryBalance =
    walletBalance.find((w) => w.currency === "NGN") ?? walletBalance[0];

  return (
    <header className="bg-background pt-4 font-display md:pt-8">
      <div className="container relative flex h-14 items-center justify-between px-4 pb-4 md:px-6">
        <Link href={logoUrl} className="ml-0 flex shrink-0 items-center">
          <Image
            src="/Fynixlogs.svg"
            className="h-16 w-auto md:hidden"
            alt="Fynix Logs"
            width={222}
            height={85}
          />
          <Image
            src={logoSrc}
            className="hidden h-20 w-auto md:block"
            alt="Fynix Logs"
            width={222}
            height={85}
          />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 md:flex">
          <NavigationMenu>
            <NavigationMenuList className="gap-6">
              {NAV_LINKS.map((item) => (
                <NavigationMenuItem key={item.title}>
                  <NavigationMenuLink
                    href={item.url}
                    className={cn(
                      "group inline-flex h-10 w-max items-center justify-center rounded-full bg-background px-4 py-2 text-sm font-medium",
                      "transition-colors hover:bg-muted hover:text-foreground",
                      "focus:bg-muted focus:text-foreground",
                      "data-[active=true]:bg-muted data-[active=true]:text-foreground",
                    )}>
                    {item.title}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hover:bg-muted hover:text-foreground md:hidden">
                <HugeiconsIcon icon={Menu01Icon} size={16} className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="font-display">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.title}
                    href={item.url}
                    className="rounded-full px-4 py-2 text-sm font-medium hover:bg-muted">
                    {item.title}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar>
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden font-medium sm:inline-block">
                {user.name}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-display w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-2 py-1">
                  <HugeiconsIcon
                    icon={Wallet01Icon}
                    size={16}
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  <div>
                    <p className="text-muted-foreground text-xs">Balance</p>
                    <p className="text-sm font-semibold">
                      {primaryBalance
                        ? formatPriceWithCurrency(primaryBalance.balance, "NGN")
                        : "₦0"}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/wallet/deposit"
                  className="flex cursor-pointer items-center gap-2">
                  <HugeiconsIcon
                    icon={Add01Icon}
                    size={16}
                    className="size-4"
                  />
                  Fund wallet
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex cursor-pointer items-center gap-2">
                  <HugeiconsIcon
                    icon={AccountSetting01Icon}
                    size={16}
                    className="size-4"
                  />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="https://t.me/fynixlogs"
                  className="flex cursor-pointer items-center gap-2">
                  <HugeiconsIcon
                    icon={Information}
                    size={16}
                    className="size-4"
                  />
                  Help & Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive">
                <HugeiconsIcon
                  icon={Logout01Icon}
                  size={16}
                  className="size-4"
                />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
