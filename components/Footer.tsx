import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TwitterIcon,
  GithubIcon,
  Linkedin01Icon,
  TelegramIcon,
} from "@hugeicons/core-free-icons";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "#" },
  { label: "Support", href: "https://t.me/rogue4l" },
  { label: "Terms & Conditions", href: "/terms" },
];

const social = [
  { icon: TwitterIcon, href: "#", label: "Twitter" },
  { icon: GithubIcon, href: "#", label: "GitHub" },
  { icon: Linkedin01Icon, href: "#", label: "LinkedIn" },
  { icon: TelegramIcon, href: "https://t.me/roguesocials", label: "Telegram" },
];

export default function Footer() {
  return (
    <footer className="bg-secondary border-t border-white/10 py-12 text-white @container">
      <div className="mx-auto max-w-3xl px-6">
        <div className="grid gap-8">
          <div className="col-span-full border-b border-white/20 pb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/Roguelong-white.svg"
                alt="Logo"
                width={150}
                height={150}
              />
            </Link>
            <div className="-ml-2 mt-6 flex gap-2">
              {social.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-white hover:opacity-80 flex size-8 items-center justify-center transition-colors"
                  aria-label={item.label}>
                  <HugeiconsIcon icon={item.icon} size={18} className="size-4" />
                </Link>
              ))}
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-white hover:opacity-80 text-sm transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-8">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Rogue. All rights reserved.
            </p>
            <ThemeToggle className="text-white hover:text-white/80" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white/70">Rogue Socials</p>
            <p className="text-xs text-white/40">A Rogue Energy Company</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
