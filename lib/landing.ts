// Public, SEO-focused category landing pages served at /buy/<slug>.
// Each entry is crawlable (no login) and renders unique copy + a live preview
// of real inventory + an FAQ + structured data.

export interface LandingFaq {
  question: string;
  answer: string;
}

export interface LandingConfig {
  slug: string;
  type: "accounts" | "smm";
  /** For account pages: keyword matched against platform/category/title. */
  match?: string;
  platformLabel: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Intro paragraphs (unique copy per page). */
  intro: string[];
  keywords: string[];
  faq: LandingFaq[];
}

export const LANDING_PAGES: LandingConfig[] = [
  {
    slug: "instagram-accounts",
    type: "accounts",
    match: "instagram",
    platformLabel: "Instagram",
    h1: "Buy Instagram Accounts",
    metaTitle: "Buy Instagram Accounts — Aged, Fresh & With Followers",
    metaDescription:
      "Buy Instagram accounts online — aged, fresh, softreg, and accounts with real followers. Instant delivery, secure crypto & card payments. Cheap prices from Rogue Socials.",
    intro: [
      "Looking to buy Instagram accounts? Rogue Socials stocks aged Instagram accounts, fresh softreg accounts, and accounts that already have real followers and posts — across many countries.",
      "Every account is delivered instantly to your dashboard after payment, with the login details and recovery info you need to take full control. Pay with crypto or card and start using your account in minutes.",
    ],
    keywords: [
      "buy instagram accounts",
      "buy aged instagram accounts",
      "instagram accounts with followers",
      "cheap instagram accounts",
      "buy instagram pva",
    ],
    faq: [
      {
        question: "Are these Instagram accounts real and usable?",
        answer:
          "Yes. Accounts come from vetted suppliers and are delivered with working login credentials. You can change the password and recovery details as soon as you receive them.",
      },
      {
        question: "How fast are Instagram accounts delivered?",
        answer:
          "Auto-fulfilled accounts are delivered instantly to your dashboard the moment your payment clears — usually within seconds.",
      },
      {
        question: "What information do I get with an account?",
        answer:
          "Depending on the listing, you receive the username, password, associated email and email password, and any cookies or tokens noted in the product description.",
      },
    ],
  },
  {
    slug: "facebook-accounts",
    type: "accounts",
    match: "facebook",
    platformLabel: "Facebook",
    h1: "Buy Facebook Accounts",
    metaTitle: "Buy Facebook Accounts — Aged, BM, Ads & Marketplace",
    metaDescription:
      "Buy Facebook accounts online — aged accounts, BM/Ads accounts, marketplace and dating accounts across many countries. Instant delivery and secure payments from Rogue Socials.",
    intro: [
      "Rogue Socials offers a wide range of Facebook accounts — aged profiles, accounts that can create pages, BM/Ads accounts, marketplace and dating accounts, and country-specific profiles.",
      "Accounts are delivered instantly with full login details so you can secure them right away. Fund your wallet with crypto or card and buy in a couple of clicks.",
    ],
    keywords: [
      "buy facebook accounts",
      "buy aged facebook accounts",
      "facebook bm accounts",
      "facebook ads accounts",
      "buy facebook marketplace accounts",
    ],
    faq: [
      {
        question: "What types of Facebook accounts can I buy?",
        answer:
          "Aged accounts, accounts that can create pages, BM/Ads accounts, marketplace and dating accounts, and profiles from specific countries — check the live listings below for what's in stock.",
      },
      {
        question: "Do you have accounts from specific countries?",
        answer:
          "Yes. Stock includes USA and many other countries. Use the marketplace filters after signing in to narrow by country and account type.",
      },
      {
        question: "How are Facebook accounts delivered?",
        answer:
          "Instantly to your dashboard after payment, with the login and recovery details included so you can take control immediately.",
      },
    ],
  },
  {
    slug: "tiktok-accounts",
    type: "accounts",
    match: "tiktok",
    platformLabel: "TikTok",
    h1: "Buy TikTok Accounts",
    metaTitle: "Buy TikTok Accounts — Aged, Fresh & With Followers",
    metaDescription:
      "Buy TikTok accounts online — aged and fresh accounts from many countries, plus accounts with followers. Cheap prices, instant delivery, secure payments from Rogue Socials.",
    intro: [
      "Buy TikTok accounts from Rogue Socials — aged and fresh accounts across dozens of countries, plus empty accounts and accounts with followers. New stock is added regularly.",
      "All auto-fulfilled TikTok accounts are delivered instantly with login details. Pay with crypto or card and get started in minutes.",
    ],
    keywords: [
      "buy tiktok accounts",
      "buy aged tiktok accounts",
      "tiktok accounts with followers",
      "cheap tiktok accounts",
      "tiktok accounts for sale",
    ],
    faq: [
      {
        question: "Can I buy TikTok accounts from a specific country?",
        answer:
          "Yes — stock covers many countries (UK, USA, Brazil, Indonesia and more). Browse the live listings and use filters in the marketplace to pick a country.",
      },
      {
        question: "Are the TikTok accounts cheap?",
        answer:
          "Prices start very low for basic accounts and scale up for aged accounts and accounts with followers. See live prices in the preview below.",
      },
      {
        question: "How do I receive my TikTok account?",
        answer:
          "Instantly in your dashboard after payment, including the login credentials listed in the product description.",
      },
    ],
  },
  {
    slug: "twitter-accounts",
    type: "accounts",
    match: "twitter",
    platformLabel: "Twitter (X)",
    h1: "Buy Twitter (X) Accounts",
    metaTitle: "Buy Twitter (X) Accounts — Aged & With Followers",
    metaDescription:
      "Buy Twitter (X) accounts online — aged empty accounts and accounts with followers. Instant delivery and secure crypto & card payments from Rogue Socials.",
    intro: [
      "Rogue Socials sells Twitter (X) accounts — aged empty accounts and accounts that already have followers. Great for building presence quickly.",
      "Accounts are delivered instantly with login details after payment. Fund with crypto or card and buy in seconds.",
    ],
    keywords: [
      "buy twitter accounts",
      "buy x accounts",
      "aged twitter accounts",
      "twitter accounts with followers",
      "buy twitter account cheap",
    ],
    faq: [
      {
        question: "Do the Twitter accounts come with followers?",
        answer:
          "Some do. Stock includes both aged empty accounts and accounts with followers — the listing title tells you which is which.",
      },
      {
        question: "How quickly are accounts delivered?",
        answer:
          "Auto-fulfilled accounts arrive in your dashboard instantly once payment is confirmed.",
      },
    ],
  },
  {
    slug: "snapchat-accounts",
    type: "accounts",
    match: "snapchat",
    platformLabel: "Snapchat",
    h1: "Buy Snapchat Accounts",
    metaTitle: "Buy Snapchat Accounts — Fresh & Aged",
    metaDescription:
      "Buy Snapchat accounts online with instant delivery and secure payments. Fresh and aged Snapchat accounts at cheap prices from Rogue Socials.",
    intro: [
      "Buy Snapchat accounts from Rogue Socials with instant delivery. Stock is added regularly — check the live preview below for what's available now.",
      "Pay with crypto or card, and receive your account details in your dashboard the moment payment clears.",
    ],
    keywords: [
      "buy snapchat accounts",
      "snapchat accounts for sale",
      "cheap snapchat accounts",
      "aged snapchat accounts",
    ],
    faq: [
      {
        question: "How are Snapchat accounts delivered?",
        answer:
          "Instantly to your dashboard after payment, with the login details included in the listing.",
      },
      {
        question: "Is stock always available?",
        answer:
          "Stock changes as accounts sell. The preview below reflects live availability — if it's empty right now, check back soon.",
      },
    ],
  },
  {
    slug: "smm-panel",
    type: "smm",
    platformLabel: "SMM",
    h1: "Cheap SMM Panel — Followers, Likes & Views",
    metaTitle: "Cheap SMM Panel — Buy Followers, Likes & Views",
    metaDescription:
      "Affordable SMM panel to buy followers, likes, views and engagement for Instagram, TikTok, YouTube and more. Fast delivery, wallet-based pricing, and an API for resellers.",
    intro: [
      "Rogue Socials runs a cheap, reliable SMM panel for boosting social media — followers, likes, views, comments and more across all major platforms.",
      "Fund your wallet once and order any service at transparent per-1,000 pricing. Resellers can automate everything through our API.",
    ],
    keywords: [
      "cheap smm panel",
      "smm panel",
      "buy instagram followers",
      "buy tiktok views",
      "smm reseller panel",
      "smm panel nigeria",
    ],
    faq: [
      {
        question: "What is an SMM panel?",
        answer:
          "An SMM panel lets you order social media engagement — followers, likes, views and more — at wholesale per-1,000 rates. You fund a wallet and place orders instantly.",
      },
      {
        question: "How fast do boosting orders start?",
        answer:
          "Most services begin within minutes of ordering. Each service shows its own speed and minimum/maximum quantity.",
      },
      {
        question: "Do you offer an API for resellers?",
        answer:
          "Yes. Resellers get an API key to fetch services, place orders and check balances programmatically, at a discounted reseller rate.",
      },
    ],
  },
];

export function getLandingBySlug(slug: string): LandingConfig | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}
