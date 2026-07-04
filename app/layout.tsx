import type { Metadata, Viewport } from "next";
import { Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import Toaster from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { CurrencyProvider } from "@/components/currency-provider";
import { resolveCurrency } from "@/lib/detect-currency";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_SOCIALS,
} from "@/lib/site";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rogue Socials — Buy Social Media Accounts & SMM Services",
    template: "%s | Rogue Socials",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Rogue Socials — Buy Social Media Accounts & SMM Services",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rogue Socials — Buy Social Media Accounts & SMM",
    description:
      "Aged & fresh social accounts plus affordable SMM boosting. Instant delivery, secure payments.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/Roguesocialsyellow.svg", type: "image/svg+xml" },
    ],
    apple: "/Roguesocialsyellow.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#E54D1B",
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/Roguesocialsyellow.svg`,
    description: SITE_DESCRIPTION,
    sameAs: SITE_SOCIALS,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { currency, rates } = await resolveCurrency();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script defer src="https://cloud.umami.is/script.js" data-website-id="60187f63-0781-44b0-9c80-2f13523f0cf6"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','925243956941129');fbq('track','PageView');`,
          }}
        />
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src="https://www.facebook.com/tr?id=925243956941129&ev=PageView&noscript=1" alt="" />
        </noscript>
      </head>
      <body
        className={`${dmSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>
          <CurrencyProvider initialCurrency={currency} rates={rates}>
            {children}
            <Toaster />
          </CurrencyProvider>
        </Providers>
      </body>
    </html>
  );
}
