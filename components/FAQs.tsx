"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "@/components/scroll-reveal";
import Link from "next/link";
import { FAQ_ITEMS as faqItems } from "@/lib/faq";

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
                href="https://t.me/rogue4l"
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
                href="https://t.me/rogue4l"
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
