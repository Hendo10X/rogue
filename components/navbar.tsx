"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <section className={cn("pb-2 pt-4 pl-1.5 pr-3 font-display sm:px-6 lg:px-9", className)}>
      <div className="container">
        {/* Desktop Menu */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-6">
            {/* Logo - desktop: Roguelong.svg (light), Roguelong-darkmode.svg (dark) */}
            <Link href={logo.url} className="flex items-center gap-2">
              <Image
                src="/Roguelong.svg"
                className="max-h-12 max-w-56 dark:hidden"
                alt={logo.alt}
                width={224}
                height={48}
              />
              <Image
                src="/Roguelong-darkmode.svg"
                className="hidden max-h-12 max-w-56 dark:block"
                alt={logo.alt}
                width={224}
                height={48}
              />
            </Link>
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
            <Button asChild variant="outline" size="sm" className="border-primary text-primary bg-transparent hover:bg-primary hover:text-white">
              <Link href={auth.login.url}>{auth.login.title}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={auth.signup.url}>{auth.signup.title}</Link>
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="block lg:hidden text-lg">
          <div className="flex items-center justify-between">
            {/* Logo - mobile: Rogue.svg always, pulled to edge */}
            <Link href={logo.url} className="-ml-0.5 flex items-center gap-2">
              <Image
                src="/Rogue.svg"
                className="max-h-8"
                alt={logo.alt}
                width={120}
                height={32}
              />
            </Link>
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
                    <Link href={logo.url} className="flex items-center gap-2">
                      <Image
                        src="/Rogue.svg"
                        className="max-h-8"
                        alt={logo.alt}
                        width={120}
                        height={32}
                      />
                    </Link>
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
                          className="text-left text-md font-semibold text-link hover:opacity-90">
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
                          className="text-md font-semibold text-link hover:opacity-90">
                          {item.title}
                        </Link>
                      ),
                    )}
                  </nav>

                  <div className="flex flex-col gap-3">
                    <Button asChild variant="outline" className="border-primary text-primary bg-transparent hover:bg-primary hover:text-white">
                      <Link href={auth.login.url}>{auth.login.title}</Link>
                    </Button>
                    <Button asChild>
                      <Link href={auth.signup.url}>{auth.signup.title}</Link>
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
