// Shared FAQ content — rendered on the home page and mirrored into FAQ
// structured data (schema.org FAQPage) so Google can show rich results.
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
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
