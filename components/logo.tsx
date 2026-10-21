import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-9 w-27",
  md: "h-11 w-33",
  lg: "h-16 w-48",
} as const;

/**
 * The Rogue lion lockup. The source artwork is a square canvas with the mark
 * sitting in a ~3:1 band across its middle, so the frame is cropped to that
 * band with object-cover rather than shipping a re-exported asset.
 */
export function Wordmark({
  size = "sm",
  className,
  priority,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden select-none",
        SIZES[size],
        className
      )}
    >
      <Image
        src="/Roguesocialsyellow.svg"
        alt="Rogue Socials"
        fill
        priority={priority}
        sizes="192px"
        className="object-cover"
      />
    </span>
  );
}

export function LogoLink({
  href = "/",
  size = "sm",
  className,
}: {
  href?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Rogue Socials home"
      className={cn(
        "inline-flex transition-opacity hover:opacity-75",
        className
      )}
    >
      <Wordmark size={size} priority />
    </Link>
  );
}
