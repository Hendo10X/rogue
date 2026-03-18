"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "@/components/scroll-reveal";
import Link from "next/link";

const faqItems = [
  {
    id: "item-1",
    question: "What platforms do you support?",
    answer:
      "We support all major platforms: Instagram, TikTok, Facebook, X (Twitter), Telegram, Threads, WhatsApp, and Messenger. You can buy verified accounts or growth services for any of these.",
  },
  {
    id: "item-2",
    question: "How fast is delivery?",
    answer:
      "Growth services typically start within minutes. Account delivery depends on the order — most are completed within minutes. You'll get real-time tracking so you know exactly when it's done.",
  },
  {
    id: "item-3",
    question: "Are the accounts and logs verified?",
    answer:
      "Yes. Every account is manually verified by our team before listing. You receive full login credentials, recovery info, and a quality guarantee.",
  },
  {
    id: "item-4",
    question: "Is it safe? Will I get banned?",
    answer:
      "We use delivery methods designed to minimize risk. All accounts and growth services follow platform guidelines. Our suppliers are vetted for quality and compliance.",
  },
  {
    id: "item-5",
    question: "What payment methods do you accept?",
    answer:
      "We accept crypto (Bitcoin, Ethereum, USDT) via Plisio and card/bank transfers via Korapay. All transactions are secure and encrypted. Your payment info is never stored.",
  },
  {
    id: "item-6",
    question: "How does account delivery work?",
    answer:
      "After you fund your wallet and place an order, we deliver login credentials and recovery info through your secure dashboard. You get full access and can change the password immediately.",
  },
  {
    id: "item-7",
    question: "Can I get a refund?",
    answer:
      "Yes. If delivery fails or doesn't match the listing, we offer a full refund or replacement. Contact support within 7 days of delivery with your order ID.",
  },
];

export default function FAQs() {
  return (
    <section className="relative py-28 font-display">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-px w-2/3 bg-linear-to-r from-transparent via-purple-500/20 to-transparent" />

      <div className="mx-auto max-w-4xl px-6">
        <div className="grid gap-12 lg:grid-cols-[0.4fr_1fr] lg:gap-16">
          <ScrollReveal className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
              FAQ
            </p>
            <h2 className="font-display text-3xl font-bold">
              Got questions?
            </h2>
            <p className="text-purple-200/50 mt-3 text-sm leading-relaxed">
              Common questions about Fynix Logs, accounts, and growth services.
            </p>
            <p className="mt-6 hidden text-sm text-purple-200/50 lg:block">
              Need more help?{" "}
              <Link
                href="https://t.me/fynixlogs"
                className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
                Contact us
              </Link>
            </p>
          </ScrollReveal>

          <ScrollReveal className="flex-1">
            <Accordion type="single" collapsible>
              {faqItems.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border-purple-500/10 border-dashed">
                  <AccordionTrigger className="cursor-pointer py-5 text-sm font-medium text-purple-100/80 hover:no-underline hover:text-purple-100 transition-colors">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pb-2 text-sm leading-relaxed text-purple-300/50">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="mt-6 text-sm text-purple-200/50 lg:hidden">
              Need more help?{" "}
              <Link
                href="https://t.me/fynixlogs"
                className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
                Contact us
              </Link>
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
