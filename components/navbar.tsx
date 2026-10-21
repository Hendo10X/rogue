"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, ArrowUpRight01Icon, Menu01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoLink, Wordmark } from "@/components/logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavLink = { href: string; label: string };

/** Section anchors on the home page; elsewhere they route back to it. */
const SECTIONS: NavLink[] = [
  { href: "#products", label: "Products" },
  { href: "#how", label: "How it works" },
  { href: "#api", label: "API" },
  { href: "#faq", label: "FAQ" },
];

const EXTERNAL: NavLink[] = [
  { href: "https://www.roguearena.gg", label: "Game coins" },
  { href: "https://www.roguearena.gg", label: "Foreign numbers" },
  { href: "https://t.me/rogue4l", label: "Support" },
];

function useHref() {
  const pathname = usePathname();
  return (href: string) =>
    href.startsWith("#") && pathname !== "/" ? `/${href}` : href;
}

/**
 * A floating pill header. It tightens and gains a glass backdrop once the
 * page scrolls, and a soft highlight glides between links on hover.
 */
export function Navbar({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const resolve = useHref();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [...SECTIONS, ...EXTERNAL];

  return (
    <header className={cn("sticky top-0 z-40 px-3 pt-3 sm:px-6", className)}>
      <div
        className={cn(
          "mx-auto flex h-14 w-full max-w-6xl items-center rounded-full pr-2 pl-4 transition-all duration-500 ease-out",
          scrolled
            ? "bg-[oklch(0.17_0.004_60/0.72)] shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_12px_40px_-12px_rgb(0_0_0/0.6)] backdrop-blur-xl"
            : "bg-transparent"
        )}
      >
        <LogoLink />

        <nav
          className="mx-auto hidden items-center lg:flex"
          onMouseLeave={() => setHover(null)}
        >
          {links.map((l) => {
            const external = l.href.startsWith("http");
            return (
              <Link
                key={l.label}
                href={resolve(l.href)}
                onMouseEnter={() => setHover(l.label)}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "relative flex h-9 items-center gap-1 rounded-full px-3.5 text-[0.8125rem] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                  external && "hidden xl:flex"
                )}
              >
                {hover === l.label && (
                  <motion.span
                    layoutId="nav-hover"
                    className="absolute inset-0 rounded-full bg-white/[0.06]"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative">{l.label}</span>
                {external && (
                  <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="relative size-3 opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/signup">Get started</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 max-w-[85vw] gap-0 p-2">
              <SheetHeader className="px-3 py-3">
                <SheetTitle>
                  <Wordmark />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-0.5">
                {links.map((l) => (
                  <Link
                    key={l.label}
                    href={resolve(l.href)}
                    onClick={() => setOpen(false)}
                    {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 p-2">
                <Button asChild variant="outline" size="lg">
                  <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
                </Button>
                <Button asChild size="lg">
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    Get started
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
