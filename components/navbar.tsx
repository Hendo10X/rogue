"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Information, TelegramIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    <section className={cn("pb-2 pt-4 px-4 font-display sm:px-6 lg:px-9", className)}>
      <div className="container">
        {/* Desktop Menu */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-6">
            {/* Logo - desktop: Roguelong.svg (light), Roguelong-darkmode.svg (dark) */}
            <Link href={logo.url} className="flex items-center gap-2">
              <Image
                src="/Roguesocialsyellow.svg"
                className="h-28 w-auto"
                alt={logo.alt}
                width={480}
                height={112}
              />
            </Link>
            <div className="flex items-center">
              <NavigationMenu viewport={false}>
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
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="group inline-flex h-10 w-max items-center justify-center rounded-full bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground">
                      Support
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[200px] gap-1 p-2">
                        <li>
                          <NavigationMenuLink asChild>
                            <Link
                              href="https://t.me/rogue4l"
                              className="select-none leading-none no-underline outline-none transition-colors">
                              <HugeiconsIcon icon={Information} size={16} className="size-4 shrink-0" />
                              <div className="text-sm font-medium leading-none">Contact Support</div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link
                              href="https://t.me/roguesocials"
                              className="select-none leading-none no-underline outline-none transition-colors">
                              <HugeiconsIcon icon={TelegramIcon} size={16} className="size-4 shrink-0" />
                              <div className="text-sm font-medium leading-none">Telegram Channel</div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
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
            {/* Logo - mobile */}
            <Link href={logo.url} className="flex items-center gap-2">
              <Image
                src="/Roguesocialsyellow.svg"
                className="h-20 w-auto"
                alt={logo.alt}
                width={360}
                height={80}
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
                        src="/Roguesocialsyellow.svg"
                        className="h-20 w-auto"
                        alt={logo.alt}
                        width={360}
                        height={80}
                      />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 p-4">
                  <nav className="flex flex-col gap-4">
                    {menu.map((item) => {
                      const mobileNavLinkClass = "text-left text-md font-semibold text-link dark:text-white dark:hover:text-rogue-lime transition-colors hover:opacity-90";
                      return item.url.startsWith("#") && isHome ? (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => scrollToSection(item.url)}
                          className={mobileNavLinkClass}>
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
                          className={mobileNavLinkClass}>
                          {item.title}
                        </Link>
                      );
                    })}
                  </nav>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="support" className="border-none">
                      <AccordionTrigger className="flex h-10 w-full items-center justify-between rounded-full bg-transparent p-0 text-md font-semibold text-link dark:text-white dark:hover:text-rogue-lime transition-colors hover:bg-transparent hover:text-foreground hover:no-underline">
                        Support
                      </AccordionTrigger>
                      <AccordionContent className="pb-0 pt-2">
                        <div className="flex flex-col gap-2 pl-4">
                          <Link
                            href="https://t.me/rogue4l"
                            onClick={() => setSheetOpen(false)}
                            className="flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                            <HugeiconsIcon icon={Information} size={16} className="size-4 shrink-0" />
                            Contact Support
                          </Link>
                          <Link
                            href="https://t.me/roguesocials"
                            onClick={() => setSheetOpen(false)}
                            className="flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                            <HugeiconsIcon icon={TelegramIcon} size={16} className="size-4 shrink-0" />
                            Telegram Channel
                          </Link>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

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
