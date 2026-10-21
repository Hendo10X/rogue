import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { LogoLink } from "@/components/logo";
import { PLATFORMS } from "@/components/landing/platforms";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

/**
 * Sign-in and sign-up share one frame: the form centred on a soft glow, with
 * a rounded brand panel beside it on large screens.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    // Exactly one screen tall on every device: the page never scrolls. The form
    // column can scroll internally only on unusually short screens.
    <div className="grid h-svh gap-2 overflow-hidden p-2 lg:grid-cols-2">
      <main className="relative flex min-h-0 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between px-3 sm:px-5 [@media(max-height:700px)]:h-12">
          <LogoLink />
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
            Back to site
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none]">
          <div className="auth-compact m-auto flex w-full max-w-sm flex-col gap-4 px-2 py-3 sm:gap-6 sm:px-4 [@media(max-height:760px)]:gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground [@media(max-height:700px)]:hidden">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </main>

      <aside className="relative hidden overflow-hidden rounded-[1.75rem] lg:flex lg:flex-col lg:justify-end lg:p-12">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(160deg,rgb(255_77_26/0.9),rgb(255_138_26/0.75)_45%,rgb(255_211_26/0.55))]" />
        <div
          aria-hidden
          className="absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.16)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_top,black,transparent)]"
        />
        <Stagger className="relative flex flex-col gap-8 text-white">
          <StaggerItem>
            <p className="max-w-[13ch] text-5xl leading-[1] font-semibold tracking-[-0.05em] text-balance">
              Buy it. Boost it. Own the feed.
            </p>
          </StaggerItem>
          <StaggerItem>
            <ul className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <li
                  key={p.name}
                  title={p.name}
                  className="flex size-11 items-center justify-center rounded-2xl bg-black/25 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1"
                >
                  <Image src={p.src} alt={p.name} width={20} height={20} className="size-5" />
                </li>
              ))}
            </ul>
          </StaggerItem>
        </Stagger>
      </aside>
    </div>
  );
}
