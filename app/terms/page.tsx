import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the Rogue Socials terms and conditions covering purchases, delivery, refunds and acceptable use.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <header >
          <div className="mx-auto w-full max-w-[88rem] px-4 py-16 sm:px-8 sm:py-20">
        <h1 className="mt-5 text-4xl leading-[0.98] font-semibold tracking-[-0.04em] sm:text-5xl">Terms and services.</h1>
            <p className="subtext mt-5 max-w-xl text-sm text-muted-foreground">What you agree to when you buy from Rogue Socials: purchases, delivery, refunds and how we handle your data.</p>
          </div>
        </header>
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-8">
        
        <div className="space-y-14">
          {/* Terms and Conditions Section */}
          <section>
            <h2 className="mb-6 pb-3 text-2xl font-semibold tracking-[-0.03em]">Terms and Conditions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Introduction</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Welcome to Rogue Socials. These Terms and Conditions govern your use of our website and services. By accessing or purchasing from Rogue Socials, you agree to comply with these terms. If you do not agree with any part of these terms, you should not use our website or services.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Our Services</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Rogue Socials provides digital products and social media marketing related services. These may include social media accounts, digital goods, and marketing tools intended for lawful online marketing and promotional activities. All services provided on this platform are intended strictly for legitimate use.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">User Responsibilities</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  By using Rogue Socials, you agree that you will:
                </p>
                <ul className="subtext mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground marker:text-primary">
                  <li>Use the platform only for lawful purposes</li>
                  <li>Not use any product purchased for fraud, scams, impersonation, or illegal activity</li>
                  <li>Provide accurate information when using the website</li>
                  <li>Follow the rules and policies of the social media platforms connected to the products</li>
                </ul>
                <p className="mt-4 text-sm font-medium text-destructive">Any misuse of the platform may result in suspension or permanent restriction from our services.</p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Disclaimer</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Rogue Socials does not support or promote fraud, scams, impersonation, or illegal activities of any kind. All products offered on the platform are sourced through legitimate and lawful means to the best of our knowledge.
                </p>
                <p className="subtext mt-2 text-sm leading-relaxed text-muted-foreground">
                  Once a product has been delivered, the buyer becomes fully responsible for how the product is used. Rogue Socials will not be held liable for misuse, abuse, or illegal activities carried out using products purchased from this platform. Users are responsible for complying with all applicable laws and platform policies when using purchased products.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Intellectual Property</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  All content on this website including logos, branding, design, and text belongs to Rogue Socials and may not be copied, reproduced, or distributed without permission.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Limitation of Liability</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Rogue Socials shall not be liable for any loss, damages, account suspensions, or restrictions that occur as a result of how customers use purchased products. Use of the website and its services is entirely at the user's own risk.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Changes to Terms</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  We reserve the right to modify these terms at any time. Updated versions will be posted on this page and continued use of the website means you accept the updated terms.
                </p>
              </div>
            </div>
          </section>

          {/* Privacy Policy Section */}
          <section>
            <h2 className="mb-6 pb-3 text-2xl font-semibold tracking-[-0.03em]">Privacy Policy</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Introduction</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Rogue Socials respects your privacy and is committed to protecting your personal information. This policy explains how we collect, use, and safeguard your data.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Information We Collect</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  When you use our website, we may collect the following information: Name, Email address, Phone number, Payment information, and Account activity on our website. This information is collected only when necessary to provide our services.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">How We Use Your Information</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Your information may be used to process orders and transactions, provide customer support, improve our website and services, and communicate important updates regarding purchases. We do not sell or rent user information to third parties.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Payment Security</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Payments on our platform may be processed through secure third-party payment processors such as Korapay or other authorized payment providers. These processors handle payment data securely according to their own privacy policies.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Data Protection</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  We take reasonable steps to protect user data from unauthorized access, misuse, or disclosure. However, no online system can guarantee complete security.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Third-Party Services</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Our website may use third-party tools or services. These services operate under their own privacy policies and Rogue Socials is not responsible for their practices.
                </p>
              </div>
            </div>
          </section>

          {/* Refund Policy Section */}
          <section>
            <h2 className="mb-6 pb-3 text-2xl font-semibold tracking-[-0.03em]">Refund Policy</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Digital Products Policy</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Rogue Socials sells digital goods. Due to the nature of digital products, most purchases are non-refundable once delivered. However, we provide a limited warranty for certain products.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Account Warranty</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  All accounts purchased from Rogue Socials include a 1-hour warranty period starting immediately after purchase. During this time, customers may report issues such as incorrect login details, non-working accounts, or accounts inaccessible at delivery.
                </p>
                <p className="subtext mt-2 text-sm leading-relaxed text-muted-foreground">
                  If the issue is verified within the warranty period, we may provide a replacement account, or a refund/store credit depending on the situation.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">Warranty Limitations</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  The 1-hour warranty becomes void if:
                </p>
                <ul className="subtext mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground marker:text-primary">
                  <li>The buyer changes account details such as password, email, or username</li>
                  <li>The account becomes restricted due to buyer actions</li>
                  <li>The warranty period has expired</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]">No Refund After Warranty Period</h3>
                <p className="subtext mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  After the 1-hour warranty window has passed, Rogue Socials cannot guarantee replacements or refunds.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
