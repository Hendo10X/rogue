import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TwitterIcon,
  TelegramIcon,
} from "@hugeicons/core-free-icons";

const links = [
  { label: "Home", href: "/" },
  { label: "Marketplace", href: "/login" },
  { label: "Support", href: "https://t.me/fynixlogs" },
  { label: "Terms & Conditions", href: "/terms" },
];

const social = [
  { icon: TwitterIcon, href: "#", label: "Twitter" },
  { icon: TelegramIcon, href: "https://t.me/fynixlogs", label: "Telegram" },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-purple-500/10 bg-[#04011a]/70 py-16 text-purple-100 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-start">
          {/* Left */}
          <div>
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/Fynixlogs.svg"
                alt="Fynix Logs"
                width={222}
                height={85}
                className="h-20 w-auto"
              />
            </Link>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-purple-300/40">
              The marketplace for premium social media accounts and growth
              services. Verified, secure, and instant.
            </p>
            <div className="-ml-2 mt-6 flex gap-1">
              {social.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex size-9 items-center justify-center rounded-full text-purple-400/60 transition-colors hover:bg-purple-500/10 hover:text-purple-300"
                  aria-label={item.label}>
                  <HugeiconsIcon icon={item.icon} size={18} className="size-[18px]" />
                </Link>
              ))}
            </div>
          </div>

          {/* Right - links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-4 lg:pt-3">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-purple-300/40 transition-colors hover:text-purple-200">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-purple-500/8 pt-8">
          <p className="text-xs text-purple-400/30">
            &copy; {new Date().getFullYear()} Fynix Logs. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
