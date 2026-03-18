"use client";

import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Clock } from "lucide-react";

const SMOOTH_EASING = [0.22, 1, 0.36, 1] as const;

const PLATFORMS = [
  { name: "X", src: "/svgs/x.svg" },
  { name: "Instagram", src: "/svgs/instagram-icon.svg" },
  { name: "Facebook", src: "/svgs/facebook-icon.svg" },
  { name: "Telegram", src: "/svgs/telegram.svg" },
  { name: "Threads", src: "/svgs/threads.svg" },
  { name: "TikTok", src: "/svgs/tiktok-icon-light.svg" },
  { name: "WhatsApp", src: "/svgs/whatsapp-icon.svg" },
  { name: "Messenger", src: "/svgs/messenger.svg" },
] as const;

const TRUST_PILLS = [
  { icon: Zap, label: "Instant Delivery" },
  { icon: Shield, label: "Verified Logs" },
  { icon: Clock, label: "24/7 Support" },
] as const;

export default function HeroSection() {
  return (
    <main className="overflow-hidden font-display">
      <section className="relative">
        {/* Asymmetric glow - shifted right */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 h-[600px] w-[500px] rounded-full bg-purple-600/12 blur-[140px]" />
          <div className="absolute -left-20 bottom-0 h-[300px] w-[400px] rounded-full bg-violet-700/8 blur-[120px]" />
        </div>

        <div className="relative pt-20 pb-10 md:pt-28 md:pb-16 lg:pt-36 lg:pb-24">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
            {/* Two-column asymmetric layout */}
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
              {/* Left: Text content */}
              <m.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
                  },
                }}>
                <m.div
                  className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-900/30 px-4 py-1.5 text-xs font-medium text-purple-300 backdrop-blur-sm"
                  style={{ boxShadow: "0 0 20px rgba(139,92,246,0.1)" }}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: { duration: 0.6, ease: SMOOTH_EASING },
                    },
                  }}>
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-purple-400" />
                  </span>
                  Trusted by 1,000+ users
                </m.div>

                <m.h1
                  className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.7, ease: SMOOTH_EASING },
                    },
                  }}>
                  Premium Social
                  <br />
                  <span className="text-gradient-purple">Media Logs.</span>
                </m.h1>

                <m.p
                  className="mt-5 max-w-lg text-base leading-relaxed text-purple-200/60 sm:text-lg"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6, ease: SMOOTH_EASING },
                    },
                  }}>
                  Buy verified social media accounts and supercharge your profiles
                  with real followers, likes, and views. Automated, secure, and
                  delivered instantly.
                </m.p>

                {/* Trust pills row */}
                <m.div
                  className="mt-6 flex flex-wrap gap-3"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6, ease: SMOOTH_EASING },
                    },
                  }}>
                  {TRUST_PILLS.map((pill) => (
                    <div
                      key={pill.label}
                      className="flex items-center gap-1.5 rounded-full border border-purple-500/10 bg-purple-950/40 px-3 py-1.5 text-xs font-medium text-purple-300/80">
                      <pill.icon className="size-3.5" />
                      {pill.label}
                    </div>
                  ))}
                </m.div>

                <m.div
                  className="mt-8 flex flex-wrap items-center gap-3"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6, ease: SMOOTH_EASING },
                    },
                  }}>
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/signup">
                      Get Started
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Browse Marketplace</Link>
                  </Button>
                </m.div>
              </m.div>

              {/* Right: Platform grid - tilted perspective */}
              <m.div
                className="relative"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.06, delayChildren: 0.35 },
                  },
                }}>
                {/* Glow behind the card grid */}
                <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
                  <div className="h-[350px] w-[350px] rounded-full bg-purple-600/10 blur-[100px]" />
                </div>

                <div className="grid grid-cols-4 gap-3 sm:gap-4 perspective-midrange">
                  {PLATFORMS.map((item, i) => (
                    <m.div
                      key={item.name}
                      className={cn(
                        i % 2 === 0 && "translate-y-3"
                      )}
                      variants={{
                        hidden: { opacity: 0, y: 24, rotateX: 15 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          rotateX: 0,
                          transition: { duration: 0.6, ease: SMOOTH_EASING },
                        },
                      }}>
                      <div className="glow-card glow-card-hover group flex flex-col items-center justify-center gap-2 rounded-2xl border border-purple-500/12 bg-purple-950/25 p-4 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/25 hover:bg-purple-900/20 sm:p-5">
                        <div className="relative flex size-9 shrink-0 items-center justify-center sm:size-11">
                          <Image
                            src={item.src}
                            alt={item.name}
                            width={28}
                            height={28}
                            className="size-7 object-contain sm:size-8"
                          />
                        </div>
                        <span className="text-center text-[11px] font-medium text-purple-300/60 sm:text-xs">
                          {item.name}
                        </span>
                      </div>
                    </m.div>
                  ))}
                </div>
              </m.div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
