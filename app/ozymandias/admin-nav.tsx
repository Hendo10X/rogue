"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  LockPasswordIcon,
  Logout03Icon,
  Menu01Icon,
  ShieldKeyIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { LogoLink, Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROOT = "/ozymandias";

const links = [
  { href: ROOT, label: "Overview" },
  { href: `${ROOT}/orders`, label: "Orders" },
  { href: `${ROOT}/users`, label: "Users" },
  { href: `${ROOT}/logs`, label: "Logs" },
  { href: `${ROOT}/boosting`, label: "Boosting" },
  { href: `${ROOT}/suppliers`, label: "Suppliers" },
  { href: `${ROOT}/api-analytics`, label: "API" },
  { href: `${ROOT}/settings`, label: "Settings" },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || (href !== ROOT && pathname.startsWith(href + "/"));
}

async function logout() {
  await fetch("/api/admin/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = `${ROOT}/login`;
}

function OzBadge() {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[linear-gradient(120deg,rgb(255_90_31/0.18),rgb(255_211_26/0.08))] px-2.5 py-1 text-xs font-medium text-[#ffc08f] shadow-[inset_0_0_0_1px_rgb(255_140_60/0.22)]">
      <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} className="size-3.5" />
      Ozymandias
    </span>
  );
}

function AccountMenu({ username }: { username: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 outline-none transition-colors hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-white/[0.07]">
        <span className="bg-rogue-gradient flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white uppercase">
          {username.slice(0, 1)}
        </span>
        <span className="hidden text-[0.8125rem] font-medium sm:inline">{username}</span>
        <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <div className="flex flex-col gap-0.5 px-2.5 py-2">
          <span className="text-xs text-muted-foreground">Signed in as</span>
          <span className="truncate text-[0.8125rem] font-medium">{username}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`${ROOT}/change-password`}>
            <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={2} />
            Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank">
            <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
            View site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
          <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Admin chrome: a slim top bar (logo, Ozymandias badge, account) above a tab
 * row. A soft pill follows the hovered tab and a gradient underline marks the
 * current one; both glide rather than jump.
 */
export function AdminNav({ username }: { username: string }) {
  const isActive = useIsActive();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="flex h-14 items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 md:hidden" aria-label="Open menu">
              <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[85vw] gap-4 p-3">
            <SheetHeader className="flex-row items-center gap-2 px-2 py-2">
              <SheetTitle>
                <Wordmark />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-0.5">
              {[...links, { href: `${ROOT}/change-password`, label: "Change password" }].map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-xl px-3 py-2.5 text-sm transition-colors",
                      active ? "bg-white/[0.07] font-medium text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <Button variant="destructive" className="mt-auto" onClick={() => void logout()}>
              Log out
            </Button>
          </SheetContent>
        </Sheet>
        <LogoLink href={ROOT} />
        <span className="text-muted-foreground/40">/</span>
        <OzBadge />
        <div className="ml-auto">
          <AccountMenu username={username} />
        </div>
      </div>

      <nav className="-mb-px hidden items-center gap-0.5 overflow-x-auto md:flex" onMouseLeave={() => setHover(null)}>
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onMouseEnter={() => setHover(link.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center px-3 text-[0.8125rem] whitespace-nowrap transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {hover === link.href && (
                <motion.span
                  layoutId="admin-hover"
                  className="absolute inset-x-0 inset-y-1.5 rounded-lg bg-white/[0.05]"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">{link.label}</span>
              {active && (
                <motion.span
                  layoutId="admin-active"
                  className="bg-rogue-gradient absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
