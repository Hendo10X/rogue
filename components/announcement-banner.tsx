"use client";

import { Fragment, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Megaphone01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";

const EASE = [0.22, 1, 0.36, 1] as const;

function parseLinks(text: string, tabbable = true) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={tabbable ? undefined : -1}
          className="cursor-pointer underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

interface Announcement {
  active: boolean;
  type: "banner" | "modal";
  message: string;
  id: string;
  /** Optional call to action, e.g. "Fund wallet" → /wallet/deposit. */
  linkLabel?: string;
  linkHref?: string;
}

type CTA = { label: string; href: string } | null;

function ctaOf(a: Announcement): CTA {
  const href = a.linkHref?.trim();
  if (!href) return null;
  return { href, label: a.linkLabel?.trim() || "Learn more" };
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

export function AnnouncementBanner({
  announcement,
}: {
  announcement: Announcement;
}) {
  const [open, setOpen] = useState(true);

  if (!announcement?.active || !announcement.message?.trim()) return null;

  const cta = ctaOf(announcement);
  return announcement.type === "banner" ? (
    open ? <AnnouncementMarquee message={announcement.message} cta={cta} onDismiss={() => setOpen(false)} /> : null
  ) : (
    <AnnouncementModal
      message={announcement.message}
      cta={cta}
      open={open}
      onDismiss={() => setOpen(false)}
    />
  );
}

function AnnouncementMarquee({
  message,
  cta,
  onDismiss,
}: {
  message: string;
  cta: CTA;
  onDismiss: () => void;
}) {
  // One repetition of the message. The duplicated half is decorative, so its
  // links stay out of the tab order.
  const item = (muted: boolean) => (
    <span className="flex items-center gap-2.5 px-6 text-[0.8125rem] font-medium whitespace-nowrap text-white">
      <HugeiconsIcon icon={Megaphone01Icon} strokeWidth={1.75} className="size-3.5 shrink-0" />
      {parseLinks(message.replace(/\s+/g, " "), !muted)}
      {cta && (
        <a
          href={cta.href}
          tabIndex={muted ? -1 : undefined}
          {...(isExternal(cta.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="rounded-full bg-black/20 px-2.5 py-0.5 underline-offset-2 hover:bg-black/30"
        >
          {cta.label} →
        </a>
      )}
    </span>
  );

  // The loop translates the track by -50%, so both halves must be identical
  // and each at least as wide as the screen.
  const half = (muted: boolean) => (
    <div
      aria-hidden={muted || undefined}
      className="flex min-w-[100vw] shrink-0 items-center justify-around"
    >
      {[0, 1, 2].map((i) => (
        <Fragment key={i}>{item(muted)}</Fragment>
      ))}
    </div>
  );

  return (
    <div className="bg-rogue-gradient relative z-50 flex items-center text-white">
      <div className="marquee-group min-w-0 flex-1 overflow-hidden py-2">
        <div className="animate-marquee flex w-max">
          {half(false)}
          {half(true)}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss announcement"
        className="flex size-9 shrink-0 items-center justify-center text-primary-foreground/80 transition-colors hover:text-primary-foreground"
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
      </button>
    </div>
  );
}

function AnnouncementModal({
  message,
  cta,
  open,
  onDismiss,
}: {
  message: string;
  cta: CTA;
  open: boolean;
  onDismiss: () => void;
}) {
  // Close on Escape, matching every other dismissible surface in the app.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={onDismiss}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-3xl bg-popover shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_30px_80px_-20px_rgb(0_0_0/0.8)]"
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <span className="flex items-center gap-2 text-sm font-medium text-[#ffb27a]">
                <HugeiconsIcon icon={Megaphone01Icon} strokeWidth={1.75} className="size-3.5" />
                Announcement
              </span>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
              </button>
            </div>

            <p
              id="announcement-title"
              className="px-5 py-5 text-sm leading-relaxed text-pretty whitespace-pre-wrap [overflow-wrap:anywhere]"
            >
              {parseLinks(message)}
            </p>

            <div className="flex flex-col gap-2 p-4 pt-0">
              {cta && (
                <Button asChild size="lg" className="w-full">
                  <a
                    href={cta.href}
                    onClick={onDismiss}
                    {...(isExternal(cta.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {cta.label}
                  </a>
                </Button>
              )}
              <Button size="lg" variant={cta ? "ghost" : "default"} className="w-full" onClick={onDismiss}>
                {cta ? "Dismiss" : "Understood"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
