"use client";

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
    { title: "Marketplace", url: "#" },
    { title: "Services", url: "#" },
    { title: "How it works", url: "#" },
  ],
  auth = {
    login: { title: "Login", url: "/login" },
    signup: { title: "Sign up", url: "/signup" },
  },
  className,
}: Navbar1Props) => {
  return (
    <section className={cn("py-4 px-9 font-display", className)}>
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
                  {menu.map((item) => renderMenuItem(item))}
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
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <HugeiconsIcon icon={Menu01Icon} size={16} className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto font-display">
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
                    {menu.map((item) => (
                      <a
                        key={item.title}
                        href={item.url}
                        className="text-md font-semibold hover:text-foreground">
                        {item.title}
                      </a>
                    ))}
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

const renderMenuItem = (item: MenuItem) => (
  <NavigationMenuItem key={item.title}>
    <NavigationMenuLink
      href={item.url}
      className="group inline-flex h-10 w-max items-center justify-center rounded-full bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground">
      {item.title}
    </NavigationMenuLink>
  </NavigationMenuItem>
);

export { Navbar };
