import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { TelegramIcon } from "@hugeicons/core-free-icons";

import { Wordmark } from "@/components/logo";
import { LANDING_PAGES } from "@/lib/landing";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Boosting", href: "/boosting" },
      { label: "Fund wallet", href: "/wallet/deposit" },
      { label: "API docs", href: "/docs/api" },
    ],
  },
  {
    title: "Rogue",
    links: [
      { label: "Game coins", href: "https://www.roguearena.gg" },
      { label: "Foreign numbers", href: "https://www.roguearena.gg" },
      { label: "Telegram channel", href: "https://t.me/roguesocials" },
      { label: "Support", href: "https://t.me/rogue4l" },
    ],
  },
  {
    title: "Buy",
    links: LANDING_PAGES.slice(0, 4).map((p) => ({ label: p.platformLabel, href: `/buy/${p.slug}` })),
  },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="surface mx-auto w-full max-w-6xl rounded-3xl px-6 py-12 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-5">
            <Wordmark size="md" />
            <p className="max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
              Aged and fresh social accounts, plus boosting for every major
              platform — paid from one wallet.
            </p>
            <a
              href="https://t.me/roguesocials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white/[0.05] px-3.5 py-2 text-[0.8125rem] text-foreground/90 transition-colors hover:bg-white/[0.09]"
            >
              <HugeiconsIcon icon={TelegramIcon} strokeWidth={1.75} className="size-4 text-[#ff9a4a]" />
              Join the channel
            </a>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <span className="text-sm font-medium">{col.title}</span>
                {col.links.map((l) => (
                  <FooterLink key={l.label} {...l} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Rogue Socials · A Rogue Energy company
          </p>
          <div className="flex gap-5">
            <Link href="/terms" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/docs/api" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              Developers
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
