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
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
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

interface NavbarProps {
  className?: string;
  menu?: MenuItem[];
  auth?: {
    login: { title: string; url: string };
    signup: { title: string; url: string };
  };
}

const Navbar = ({
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
}: NavbarProps) => {
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
    <section
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-purple-500/10 bg-[#06031a]/80 backdrop-blur-xl font-display",
        className,
      )}>
      <div className="container px-4 sm:px-6 lg:px-10">
        {/* Desktop */}
        <nav className="hidden h-22 items-center justify-between lg:flex">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/Fynixlogs.svg"
                alt="Fynix Logs"
                width={222}
                height={85}
                className="h-20 w-auto"
              />
            </Link>
            <div className="flex items-center">
              <NavigationMenu viewport={false}>
                <NavigationMenuList>
                  {menu.map((item) => {
                    const navLinkClass =
                      "group inline-flex h-10 w-max items-center justify-center rounded-full bg-transparent px-4 py-2 text-sm font-medium text-purple-200/50 transition-colors hover:bg-purple-500/8 hover:text-purple-200";
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
                    <NavigationMenuTrigger className="group inline-flex h-10 w-max items-center justify-center rounded-full bg-transparent px-4 py-2 text-sm font-medium text-purple-200/50 transition-colors hover:bg-purple-500/8 hover:text-purple-200">
                      Support
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[200px] gap-1 p-2">
                        <li>
                          <NavigationMenuLink asChild>
                            <Link
                              href="https://t.me/fynixlogs"
                              className="select-none leading-none no-underline outline-none transition-colors">
                              <HugeiconsIcon icon={Information} size={16} className="size-4 shrink-0" />
                              <div className="text-sm font-medium leading-none">Contact Support</div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link
                              href="https://t.me/fynixlogs"
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
            <Button asChild variant="ghost" size="sm" className="text-purple-200/60">
              <Link href={auth.login.url}>{auth.login.title}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={auth.signup.url}>{auth.signup.title}</Link>
            </Button>
          </div>
        </nav>

        {/* Mobile */}
        <div className="flex h-18 items-center justify-between lg:hidden">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/Fynixlogs.svg"
              alt="Fynix Logs"
              width={222}
              height={85}
              className="h-16 w-auto"
            />
          </Link>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hover:bg-purple-500/10">
                <HugeiconsIcon icon={Menu01Icon} size={20} className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              showCloseButton
              closeButtonSize="lg"
              className="w-[280px] overflow-y-auto font-display border-purple-500/10 bg-[#08031e]/95 backdrop-blur-xl sm:max-w-[320px]">
              <SheetHeader>
                <SheetTitle>
                  <Link
                    href="/"
                    onClick={() => setSheetOpen(false)}
                    className="flex shrink-0 items-center">
                    <Image
                      src="/Fynixlogs.svg"
                      alt="Fynix Logs"
                      width={222}
                      height={85}
                      className="h-16 w-auto"
                    />
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-2 pt-4">
                <nav className="flex flex-col gap-4">
                  {menu.map((item) => {
                    const cls = "text-left text-base font-semibold text-purple-200 transition-colors hover:text-purple-400";
                    return item.url.startsWith("#") && isHome ? (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => scrollToSection(item.url)}
                        className={cls}>
                        {item.title}
                      </button>
                    ) : (
                      <Link
                        key={item.title}
                        href={item.url.startsWith("#") ? `/${item.url}` : item.url}
                        onClick={() => setSheetOpen(false)}
                        className={cls}>
                        {item.title}
                      </Link>
                    );
                  })}
                </nav>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="support" className="border-none">
                    <AccordionTrigger className="flex h-10 w-full items-center justify-between rounded-full bg-transparent p-0 text-base font-semibold text-purple-200 transition-colors hover:bg-transparent hover:text-purple-400 hover:no-underline">
                      Support
                    </AccordionTrigger>
                    <AccordionContent className="pb-0 pt-2">
                      <div className="flex flex-col gap-2 pl-2">
                        <Link
                          href="https://t.me/fynixlogs"
                          onClick={() => setSheetOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-purple-300/60 hover:bg-purple-500/10 hover:text-purple-300">
                          <HugeiconsIcon icon={Information} size={16} className="size-4 shrink-0" />
                          Contact Support
                        </Link>
                        <Link
                          href="https://t.me/fynixlogs"
                          onClick={() => setSheetOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-purple-300/60 hover:bg-purple-500/10 hover:text-purple-300">
                          <HugeiconsIcon icon={TelegramIcon} size={16} className="size-4 shrink-0" />
                          Telegram Channel
                        </Link>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex flex-col gap-3 pt-2">
                  <Button asChild variant="outline">
                    <Link href={auth.login.url} onClick={() => setSheetOpen(false)}>
                      {auth.login.title}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={auth.signup.url} onClick={() => setSheetOpen(false)}>
                      {auth.signup.title}
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </section>
  );
};

export { Navbar };
