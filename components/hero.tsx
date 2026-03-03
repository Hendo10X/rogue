"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

const SMOOTH_EASING = [0.22, 1, 0.36, 1] as const;

const GRID_ITEMS = [
  { name: "X", src: "/svgs/x.svg", blur: false },
  { name: "Instagram", src: "/svgs/instagram-icon.svg", blur: false },
  { name: "Facebook", src: "/svgs/facebook-icon.svg", blur: false },
  { name: "Telegram", src: "/svgs/telegram.svg", blur: false },
  { name: "Threads", src: "/svgs/threads.svg", blur: false },
  { name: "TikTok", src: "/svgs/tiktok-icon-light.svg", blur: false },
  { name: "WhatsApp", src: "/svgs/whatsapp-icon.svg", blur: false },
  { name: "Messenger", src: "/svgs/messenger.svg", blur: false },
] as const;

export default function HeroSection() {
  return (
    <main className="overflow-hidden font-display">
      <section className="bg-background">
        <div className="relative pt-16 pb-16 md:pt-20 md:pb-20">
          <div className="mask-radial-from-45% mask-radial-to-75% mask-radial-at-top mask-radial-[75%_100%] mask-t-from-50% lg:aspect-9/4 absolute inset-0 aspect-square bg-linear-to-b from-muted/30 to-transparent lg:top-24 dark:opacity-50" />
          <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
            <motion.div
              className="mx-auto max-w-md text-center"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.1,
                    delayChildren: 0.1,
                  },
                },
              }}>
              <motion.h1
                className="text-balance font-display text-4xl font-semibold sm:text-5xl"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: SMOOTH_EASING },
                  },
                }}>
                Buy & Boost Social Media Accounts.
              </motion.h1>
              <motion.p
                className="text-muted-foreground mt-4 text-balance"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: SMOOTH_EASING },
                  },
                }}>
                A powerful marketplace for buying premium social media
                accounts and instant growth services, for any platform.
              </motion.p>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: SMOOTH_EASING },
                  },
                }}>
                <Button asChild className="mt-6 pr-1.5">
                  <Link href="/login">
                    <span className="text-nowrap">Start Growing</span>
                    <ChevronRight className="opacity-50" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
            <motion.div
              className="mx-auto mt-24 max-w-2xl"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.06,
                    delayChildren: 0.4,
                  },
                },
              }}>
              <div className="grid scale-95 grid-cols-4 gap-6 sm:grid-cols-4 sm:gap-8">
                {GRID_ITEMS.map((item) => (
                  <motion.div
                    key={item.name}
                    className={cn(item.blur && "blur-[2px]")}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.55, ease: SMOOTH_EASING },
                      },
                    }}>
                    <Card className="border-0 shadow-foreground/10 flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-4 py-4 sm:px-5 sm:py-5">
                      <div className="flex size-10 shrink-0 items-center justify-center sm:size-12">
                        <Image
                          src={item.src}
                          alt={item.name}
                          width={24}
                          height={24}
                          className="size-6 object-contain sm:size-8 dark:invert-[.8]"
                        />
                      </div>
                      <span className="text-center text-xs font-medium sm:text-sm">
                        {item.name}
                      </span>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
