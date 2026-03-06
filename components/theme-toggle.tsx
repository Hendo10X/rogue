"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sun02Icon,
  Moon02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({
  asDropdownItem,
  className,
}: {
  asDropdownItem?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return asDropdownItem ? (
      <DropdownMenuItem disabled className="flex cursor-pointer items-center gap-2">
        <span className="size-4" />
        Theme
      </DropdownMenuItem>
    ) : (
      <Button variant="ghost" size="icon" className="size-9 shrink-0" disabled />
    );
  }

  if (asDropdownItem) {
    return (
      <DropdownMenuItem onClick={toggle} className="flex cursor-pointer items-center gap-2">
        {theme === "dark" ? (
          <>
            <HugeiconsIcon icon={Sun02Icon} size={16} className="size-4" />
            Light mode
          </>
        ) : (
          <>
            <HugeiconsIcon icon={Moon02Icon} size={16} className="size-4" />
            Dark mode
          </>
        )}
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={className ?? "shrink-0"}
    >
      {theme === "dark" ? (
        <HugeiconsIcon icon={Sun02Icon} size={20} className="size-5" />
      ) : (
        <HugeiconsIcon icon={Moon02Icon} size={20} className="size-5" />
      )}
    </Button>
  );
}
