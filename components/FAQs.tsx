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
      "Growth services typically start within minutes. Account delivery depends on the order—most are completed within 24–48 hours. You'll get real-time tracking so you know exactly when it's done.",
  },
  {
    id: "item-3",
    question: "Are the followers and accounts real?",
    answer:
      "Yes. We only work with real, active accounts from verified suppliers. Growth services use organic methods. We do not use bots or fake engagement.",
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
      "After you fund your wallet and place an order, we deliver login credentials and recovery info through our secure dashboard. You get full access and can change the password immediately.",
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
    <section className="bg-background @container py-24 font-display">
      <div className="mx-auto max-w-3xl px-6">
        <div className="@xl:flex-row @xl:items-start @xl:gap-12 flex flex-col gap-8">
          <ScrollReveal className="@xl:sticky @xl:top-24 @xl:w-64 shrink-0">
            <h2 className="font-display text-3xl font-semibold">FAQs</h2>
            <p className="text-muted-foreground mt-3 text-sm">
              Common questions about accounts and growth services
            </p>
            <p className="text-muted-foreground @xl:block mt-6 hidden text-sm">
              Need more help?{" "}
              <Link
                href="#"
                className="text-foreground font-medium hover:underline">
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
                  className="border-dashed">
                  <AccordionTrigger className="cursor-pointer py-4 text-sm font-medium hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground pb-2 text-sm">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="text-muted-foreground @xl:hidden mt-6 text-sm">
              Need more help?{" "}
              <Link
                href="#"
                className="text-foreground font-medium hover:underline">
                Contact us
              </Link>
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
