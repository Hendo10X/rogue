"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { animate } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
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

interface MenuItem {
  title: string;
  url: string;
}

interface Navbar1Props {
  className?: string;
  logo?: {
    url: string;
    src?: string;
    srcDesktop?: string;
    srcMobile?: string;
    alt: string;
    title: string;
    className?: string;
  };
  menu?: MenuItem[];
  auth?: {
    login: {
      title: string;
      url: string;
    };
    signup: {
      title: string;
      url: string;
    };
  };
}

const Navbar = ({
  logo = {
    url: "/",
    srcDesktop: "/Roguelong.svg",
    srcMobile: "/Rogue.svg",
    alt: "Rogue",
    title: "Rogue",
  },
  menu = [
    { title: "Marketplace", url: "/login" },
    { title: "Services", url: "#features" },
    { title: "How it works", url: "#how-it-works" },
  ],
  auth = {
    login: { title: "Login", url: "/login" },
    signup: { title: "Sign up", url: "/signup" },
  },
  className,
}: Navbar1Props) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      setSheetOpen(false);
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        animate(window.scrollY, top, {
          type: "tween",
          ease: [0.32, 0.72, 0, 1],
          duration: 0.8,
          onUpdate: (v) => window.scrollTo(0, v),
        });
      }
    }
  };

  return (
    <section className={cn("pb-2 pt-4 px-9 font-display", className)}>
      <div className="container">
        {/* Desktop Menu */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-6">
            {/* Logo - desktop: Roguelong.svg */}
            <a href={logo.url} className="flex items-center gap-2">
              <img
                src={logo.srcDesktop ?? logo.src ?? "/Roguelong.svg"}
                className="max-h-12 dark:invert max-w-56"
                alt={logo.alt}
                width={224}
                height={48}
              />
            </a>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {menu.map((item) => {
                    const navLinkClass =
                      "group inline-flex h-10 w-max items-center justify-center rounded-full bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground";
                    return (
                      <NavigationMenuItem key={item.title}>
                        {item.url.startsWith("#") && isHome ? (
                          <button
                            type="button"
                            onClick={() => scrollToSection(item.url)}
                            className={navLinkClass}>
                            {item.title}
                          </button>
                        ) : (
                          <Link
                            href={
                              item.url.startsWith("#")
                                ? `/${item.url}`
                                : item.url
                            }
                            className={navLinkClass}>
                            {item.title}
                          </Link>
                        )}
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={auth.login.url}>{auth.login.title}</a>
            </Button>
            <Button asChild size="sm">
              <a href={auth.signup.url}>{auth.signup.title}</a>
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="block lg:hidden text-lg">
          <div className="flex items-center justify-between">
            {/* Logo - mobile: Rogue.svg */}
            <a href={logo.url} className="flex items-center gap-2">
              <img
                src={logo.srcMobile ?? logo.src ?? "/Rogue.svg"}
                className="max-h-8 dark:invert"
                alt={logo.alt}
              />
            </a>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="hover:bg-muted hover:text-foreground">
                  <HugeiconsIcon
                    icon={Menu01Icon}
                    size={16}
                    className="size-4"
                  />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="top"
                motionOpen={sheetOpen}
                showCloseButton
                closeButtonSize="lg"
                className="overflow-y-auto font-display">
                <SheetHeader>
                  <SheetTitle>
                    <a href={logo.url} className="flex items-center gap-2">
                      <img
                        src={logo.srcMobile ?? logo.src ?? "/Rogue.svg"}
                        className="max-h-8 dark:invert"
                        alt={logo.alt}
                      />
                    </a>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-4">
                  <nav className="flex flex-col gap-4">
                    {menu.map((item) =>
                      item.url.startsWith("#") && isHome ? (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => scrollToSection(item.url)}
                          className="text-left text-md font-semibold hover:text-green-800 dark:hover:text-green-400">
                          {item.title}
                        </button>
                      ) : (
                        <Link
                          key={item.title}
                          href={
                            item.url.startsWith("#")
                              ? `/${item.url}`
                              : item.url
                          }
                          onClick={() => setSheetOpen(false)}
                          className="text-md font-semibold hover:text-green-800 dark:hover:text-green-400">
                          {item.title}
                        </Link>
                      ),
                    )}
                  </nav>

                  <div className="flex flex-col gap-3">
                    <Button asChild variant="outline">
                      <a href={auth.login.url}>{auth.login.title}</a>
                    </Button>
                    <Button asChild>
                      <a href={auth.signup.url}>{auth.signup.title}</a>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Navbar };
