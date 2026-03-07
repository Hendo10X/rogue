"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/change-password", label: "Change Password" },
];

interface AdminNavProps {
  username: string;
}

function NavLinks({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={className}>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`block text-sm font-medium transition-colors hover:text-link ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNav({ username }: AdminNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/admin/login";
  }

  return (
    <>
      {/* Desktop: horizontal nav */}
      <div className="hidden w-full items-center gap-4 md:flex">
        <NavLinks pathname={pathname} className="flex flex-wrap gap-4" />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-muted-foreground text-sm">{username}</span>
          <Separator orientation="vertical" className="h-4" />
          <button
            type="button"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile: hamburger menu */}
      <div className="flex flex-1 items-center gap-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="shrink-0"
        >
          <HugeiconsIcon icon={Menu01Icon} size={20} className="size-5" />
        </Button>
        <span className="text-sm font-medium">Admin</span>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="flex flex-col gap-4 p-6">
            <SheetHeader>
              <SheetTitle>Admin</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4">
              <NavLinks
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
                className="flex flex-col gap-2"
              />
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">Logged in as</span>
                <span className="font-medium">{username}</span>
              </div>
              <Separator />
              <button
                type="button"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground text-left text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
