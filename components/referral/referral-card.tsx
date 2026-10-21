"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, GiftIcon, Share08Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Price } from "@/components/currency-provider";

export type ReferralCardData = {
  code: string;
  percent: number;
  invited: number;
  rewarded: number;
  earned: number;
};

/**
 * "Invite a friend": the user's link with copy and native share, plus how many
 * people they've brought in and what it has earned.
 */
export function ReferralCard({ data, className }: { data: ReferralCardData; className?: string }) {
  const [origin, setOrigin] = useState("https://roguesocials.com");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const link = `${origin}/signup?ref=${data.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — long-press the link to copy it.");
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "Rogue Socials",
        text: "Buy and boost social accounts on Rogue Socials.",
        url: link,
      });
    } catch {
      // Dismissed share sheet — nothing to do.
    }
  }

  const off = data.percent <= 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 shadow-[inset_0_0_0_1px_rgb(255_140_60/0.14)]",
        className
      )}
    >
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(140deg,rgb(255_90_31/0.14),rgb(255_211_26/0.04)_55%,transparent_85%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="bg-rogue-gradient flex size-10 shrink-0 items-center justify-center rounded-2xl text-white">
            <HugeiconsIcon icon={GiftIcon} strokeWidth={1.75} className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[0.9375rem] font-semibold tracking-[-0.015em]">Invite friends, earn {off ? "rewards" : `${data.percent}%`}</h2>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              {off
                ? "Referral rewards are paused right now, but your link still tracks invites."
                : `Get ${data.percent}% of a friend's first deposit, added straight to your wallet.`}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-black/25 p-1.5 pl-4">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/80 sm:text-[0.8125rem]">{link}</span>
          {canShare && (
            <button
              type="button"
              onClick={share}
              aria-label="Share referral link"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
            >
              <HugeiconsIcon icon={Share08Icon} strokeWidth={2} className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(100deg,#ff4d1a,#ffa51a)] px-3.5 text-xs font-medium text-white transition-transform active:scale-95"
          >
            <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} className="size-3.5" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <dl className="grid grid-cols-3 gap-2">
          <Stat term="Invited" value={data.invited.toLocaleString()} />
          <Stat term="Rewarded" value={data.rewarded.toLocaleString()} />
          <Stat term="Earned" value={<Price ngn={data.earned} />} />
        </dl>
      </div>
    </div>
  );
}

function Stat({ term, value }: { term: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-black/20 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="mt-1 truncate text-base font-semibold tracking-[-0.02em] tabular-nums">{value}</dd>
    </div>
  );
}
