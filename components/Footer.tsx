import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TwitterIcon,
  GithubIcon,
  Linkedin01Icon,
} from "@hugeicons/core-free-icons";

const links = [
  { label: "Home", href: "/" },
  { label: "Features", href: "#" },
  { label: "Pricing", href: "#" },
  { label: "About", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Contact", href: "#" },
];

const social = [
  { icon: TwitterIcon, href: "#", label: "Twitter" },
  { icon: GithubIcon, href: "#", label: "GitHub" },
  { icon: Linkedin01Icon, href: "#", label: "LinkedIn" },
];

export default function Footer() {
  return (
    <footer className="bg-secondary @container border-t py-12">
      <div className="mx-auto max-w-3xl px-6">
        <div className="grid gap-8">
          <div className="col-span-full border-primary/20 border-b pb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/Roguelong-white.svg"
                alt="Logo"
                width={150}
                height={150}
                className="dark:invert"
              />
            </Link>
            <div className="-ml-2 mt-6 flex gap-2">
              {social.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-primary hover:text-primary/80 flex size-8 items-center justify-center transition-colors"
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
                className="text-primary hover:text-primary/80 text-sm transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-primary/20 border-t pt-8">
            <p className="text-primary text-sm">
              &copy; {new Date().getFullYear()} Rogue. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
