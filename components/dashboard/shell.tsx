"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AccountSetting01Icon,
  Add01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CodeIcon,
  DashboardSquare01Icon,
  Logout03Icon,
  Menu01Icon,
  PackageIcon,
  Rocket01Icon,
  ShieldKeyIcon,
  ShoppingBag01Icon,
  UnfoldMoreIcon,
  Wallet01Icon,
  Wrench01Icon,
  BookOpen01Icon,
  ArrowDown01Icon,
  FileSearchIcon,
  Globe02Icon,
  SquareLock02Icon,
  SmartPhone01Icon,
  Information,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { authClient } from "@/utils/auth-client";
import { useCurrency } from "@/components/currency-provider";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { LogoLink, Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { FitText } from "@/components/ui/fit-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Icon = typeof PackageIcon;

type NavItem = { href: string; label: string; icon: Icon; dot?: "requests"; children?: NavItem[] };

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: DashboardSquare01Icon },
  { href: "/marketplace", label: "Marketplace", icon: PackageIcon },
  { href: "/boosting", label: "Boosting", icon: Rocket01Icon },
  { href: "/tools/proxies", label: "Proxies", icon: Globe02Icon },
  { href: "/orders", label: "Orders", icon: ShoppingBag01Icon },
  { href: "/wallet/deposit", label: "Wallet", icon: Wallet01Icon },
  {
    href: "/tools",
    label: "Tools",
    icon: Wrench01Icon,
    children: [
      { href: "/tools/otp", label: "OTP numbers", icon: SmartPhone01Icon },
      { href: "/tools/2fa", label: "2FA codes", icon: SquareLock02Icon },
      { href: "/tools/request-log", label: "Request a log", icon: FileSearchIcon, dot: "requests" },
      { href: "/tutorials", label: "Tutorials", icon: BookOpen01Icon },
    ],
  },
];

/** Unread replies to the customer's log requests (the red dot). */
function useRequestReplies() {
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      return res.ok ? ((await res.json()) as { requestReplies: number }) : { requestReplies: 0 };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return data?.requestReplies ?? 0;
}

function Dot() {
  return <span aria-label="New reply" className="relative ml-auto size-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_3px_rgb(239_68_68/0.18)]" />;
}

const EXTRAS: { href: string; label: string }[] = [
  { href: "/docs/api", label: "API docs" },
  { href: "https://www.roguearena.gg", label: "Game coins" },
  { href: "https://www.roguearena.gg", label: "Foreign numbers" },
  { href: "https://t.me/rogue4l", label: "Support" },
];

export type ShellUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type ShellProps = {
  user: ShellUser;
  walletBalance: { balance: string; currency: string }[];
  /** Admin emails get a "Switch to admin" entry. Computed on the server. */
  isAdmin?: boolean;
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

function useBalance(walletBalance: ShellProps["walletBalance"]) {
  const { format } = useCurrency();
  const primary = walletBalance.find((w) => w.currency === "NGN") ?? walletBalance[0];
  return format(primary ? parseFloat(primary.balance) : 0);
}

/**
 * Pill nav. The active pill is one shared element that glides between rows,
 * and hovering previews where it would land.
 */
function NavList({
  onNavigate,
  layoutKey,
  isAdmin,
}: {
  onNavigate?: () => void;
  layoutKey: string;
  isAdmin?: boolean;
}) {
  const isActive = useIsActive();
  const [hover, setHover] = React.useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const replies = useRequestReplies();
  const rowProps = { isActive, hover, setHover, layoutKey, onNavigate };

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-col gap-0.5" onMouseLeave={() => setHover(null)}>
        {ITEMS.map((item) => {
          if (!item.children) return <NavRow key={item.href} item={item} {...rowProps} />;
          const childActive = item.children.some((c) => isActive(c.href)) || isActive(item.href);
          const open = toolsOpen || childActive;
          const dot = item.children.some((c) => c.dot === "requests") && replies > 0;
          return (
            <div key={item.href} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setToolsOpen((v) => !v)}
                onMouseEnter={() => setHover(item.href)}
                aria-expanded={open}
                className="relative flex h-9 items-center gap-3 rounded-xl px-3 text-left text-[0.8125rem] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {hover === item.href && (
                  <motion.span
                    layoutId={`${layoutKey}-hover`}
                    className="absolute inset-0 rounded-xl bg-white/[0.035]"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <HugeiconsIcon icon={item.icon} strokeWidth={1.75} className="relative size-[18px] shrink-0" />
                <span className="relative">{item.label}</span>
                {dot && !open ? <Dot /> : null}
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  className={cn("relative size-3.5 shrink-0 transition-transform duration-200", dot && !open ? "ml-2" : "ml-auto", open && "rotate-180")}
                />
              </button>
              {open && (
                <div className="ml-[1.375rem] flex flex-col gap-0.5 pl-2">
                  {item.children.map((child) => (
                    <NavRow key={child.href} item={child} {...rowProps} small showDot={child.dot === "requests" && replies > 0} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {isAdmin && (
        <a
          href="/api/admin/auth/email"
          onClick={onNavigate}
          className="group relative flex h-10 items-center gap-3 overflow-hidden rounded-xl bg-[linear-gradient(120deg,rgb(255_90_31/0.14),rgb(255_211_26/0.05))] px-3 text-[0.8125rem] font-medium text-[#ffc08f] shadow-[inset_0_0_0_1px_rgb(255_140_60/0.18)] transition-colors hover:text-[#ffd9b8]"
        >
          <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={1.75} className="size-[18px] shrink-0" />
          Switch to admin
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="ml-auto size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </a>
      )}
      <div className="flex flex-col gap-0.5">
        <span className="px-3 pb-1 text-xs text-muted-foreground/60">More from Rogue</span>
        {EXTRAS.map((item) => {
          const external = item.href.startsWith("http");
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group flex h-8 items-center justify-between rounded-lg px-3 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-white/[0.035] hover:text-foreground"
            >
              {item.label}
              {external && (
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  strokeWidth={2}
                  className="size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-60"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NavRow({
  item,
  isActive,
  hover,
  setHover,
  layoutKey,
  onNavigate,
  small,
  showDot,
}: {
  item: NavItem;
  isActive: (href: string) => boolean;
  hover: string | null;
  setHover: (href: string | null) => void;
  layoutKey: string;
  onNavigate?: () => void;
  small?: boolean;
  showDot?: boolean;
}) {
  const active = isActive(item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      onMouseEnter={() => setHover(item.href)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 text-[0.8125rem] font-medium transition-colors duration-200",
        small ? "h-8" : "h-9",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId={`${layoutKey}-active`}
          className="absolute inset-0 rounded-xl bg-white/[0.07] shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      {hover === item.href && !active && (
        <motion.span
          layoutId={`${layoutKey}-hover`}
          className="absolute inset-0 rounded-xl bg-white/[0.035]"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <HugeiconsIcon
        icon={item.icon}
        strokeWidth={1.75}
        className={cn("relative shrink-0 transition-colors", small ? "size-4" : "size-[18px]", active && "text-[#ff9a4a]")}
      />
      <span className="relative">{item.label}</span>
      {showDot && <Dot />}
    </Link>
  );
}

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function UserMenu({
  user,
  variant = "avatar",
  isAdmin,
}: {
  user: ShellUser;
  variant?: "avatar" | "row";
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleLogout() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          variant === "row"
            ? "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04] data-[state=open]:bg-white/[0.06]"
            : "rounded-full transition-transform active:scale-[0.95]"
        )}
        aria-label="Open account menu"
      >
        <Avatar className="size-8">
          {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
          <AvatarFallback className="bg-rogue-gradient text-[0.6875rem] font-semibold text-white">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
        {variant === "row" && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
            <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "row" ? "start" : "end"}
        side={variant === "row" ? "top" : "bottom"}
        sideOffset={8}
        className="w-60"
      >
        <div className="flex flex-col gap-0.5 px-2.5 py-2">
          <span className="truncate text-[0.8125rem] font-medium">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <HugeiconsIcon icon={AccountSetting01Icon} strokeWidth={2} />
          Settings
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => (window.location.href = "/api/admin/auth/email")}>
            <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} />
            Switch to admin
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push("/docs/api")}>
          <HugeiconsIcon icon={CodeIcon} strokeWidth={2} />
          API docs
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://t.me/rogue4l" target="_blank" rel="noopener noreferrer">
            <HugeiconsIcon icon={Information} strokeWidth={2} />
            Help &amp; support
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
        >
          <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The wallet card at the foot of the rail, with a warm gradient wash. */
function BalanceCard({ walletBalance }: { walletBalance: ShellProps["walletBalance"] }) {
  const balance = useBalance(walletBalance);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(150deg,rgb(255_90_31/0.16),rgb(255_211_26/0.05)_60%,transparent)] p-4 shadow-[inset_0_0_0_1px_rgb(255_140_60/0.12)]">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Balance</span>
        <CurrencySwitcher className="h-6 px-2 text-xs" />
      </div>
      <p className="mt-1.5 text-xl leading-tight font-semibold tracking-[-0.03em] tabular-nums">
        <FitText minScale={0.55}>{balance}</FitText>
      </p>
      <Button asChild size="sm" className="mt-3 w-full">
        <Link href="/wallet/deposit">
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Add funds
        </Link>
      </Button>
    </div>
  );
}

/** Desktop rail. Same tone as the page, so the content panel floats above it. */
function Sidebar({ user, walletBalance, isAdmin }: ShellProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto px-3 py-4 lg:flex lg:h-full">
      <div className="px-2 pt-1">
        <LogoLink href="/dashboard" />
      </div>
      <NavList layoutKey="rail" isAdmin={isAdmin} />
      <div className="mt-auto flex flex-col gap-2">
        <BalanceCard walletBalance={walletBalance} />
        <UserMenu user={user} variant="row" isAdmin={isAdmin} />
      </div>
    </aside>
  );
}

/** Mobile bar — the rail folds into a floating sheet below `lg`. */
function Topbar({ user, walletBalance, isAdmin }: ShellProps) {
  const [open, setOpen] = React.useState(false);
  const balance = useBalance(walletBalance);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-background/80 px-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-1">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[85vw] gap-4 p-3">
            <SheetHeader className="px-2 py-2">
              <SheetTitle>
                <Wordmark />
              </SheetTitle>
            </SheetHeader>
            <NavList layoutKey="sheet" isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <BalanceCard walletBalance={walletBalance} />
            </div>
          </SheetContent>
        </Sheet>
        <LogoLink href="/dashboard" />
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/wallet/deposit"
          className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium tabular-nums transition-colors hover:bg-white/[0.09]"
          title="Wallet balance"
        >
          {balance}
        </Link>
        <UserMenu user={user} isAdmin={isAdmin} />
      </div>
    </header>
  );
}

/**
 * The dashboard chrome. On desktop the page is the rail, and the content sits
 * on a rounded panel that owns the scroll; below `lg` the document scrolls
 * normally so the browser can collapse its address bar.
 */
export function DashboardShell({
  children,
  banner,
  wide,
  ...props
}: ShellProps & {
  children: React.ReactNode;
  banner?: React.ReactNode;
  /** Let the content run wider than the default reading measure. */
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-svh flex-col lg:h-svh lg:min-h-0 lg:overflow-hidden">
      {banner}
      <div className="flex flex-1 lg:min-h-0">
        <Sidebar {...props} />
        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:py-2 lg:pr-2">
          <Topbar {...props} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:overflow-y-auto lg:rounded-[1.25rem] lg:bg-[oklch(0.16_0.004_60)] lg:px-10 lg:py-10 lg:shadow-[0_0_0_1px_rgb(255_255_255/0.04)]">
            <div className={cn("mx-auto flex w-full flex-col gap-8", wide ? "max-w-6xl" : "max-w-5xl")}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
