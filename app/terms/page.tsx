import { Navbar } from "@/components/navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-display">
      <Navbar />
      <main className="grow container mx-auto px-6 py-12 lg:py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-foreground tracking-tight">Terms and Services</h1>
        
        <div className="space-y-12 prose dark:prose-invert prose-green max-w-none">
          {/* Terms and Conditions Section */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary border-b border-border pb-2">Terms and Conditions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Introduction</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to Fynix Logs. These Terms and Conditions govern your use of our website and services. By accessing or purchasing from Fynix Logs, you agree to comply with these terms. If you do not agree with any part of these terms, you should not use our website or services.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Our Services</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Fynix Logs provides digital products and social media marketing related services. These may include social media accounts, digital goods, and marketing tools intended for lawful online marketing and promotional activities. All services provided on this platform are intended strictly for legitimate use.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">User Responsibilities</h3>
                <p className="text-muted-foreground leading-relaxed">
                  By using Fynix Logs, you agree that you will:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                  <li>Use the platform only for lawful purposes</li>
                  <li>Not use any product purchased for fraud, scams, impersonation, or illegal activity</li>
                  <li>Provide accurate information when using the website</li>
                  <li>Follow the rules and policies of the social media platforms connected to the products</li>
                </ul>
                <p className="mt-4 text-sm font-medium text-destructive">Any misuse of the platform may result in suspension or permanent restriction from our services.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Disclaimer</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Fynix Logs does not support or promote fraud, scams, impersonation, or illegal activities of any kind. All products offered on the platform are sourced through legitimate and lawful means to the best of our knowledge.
                </p>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  Once a product has been delivered, the buyer becomes fully responsible for how the product is used. Fynix Logs will not be held liable for misuse, abuse, or illegal activities carried out using products purchased from this platform. Users are responsible for complying with all applicable laws and platform policies when using purchased products.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Intellectual Property</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All content on this website including logos, branding, design, and text belongs to Fynix Logs and may not be copied, reproduced, or distributed without permission.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Limitation of Liability</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Fynix Logs shall not be liable for any loss, damages, account suspensions, or restrictions that occur as a result of how customers use purchased products. Use of the website and its services is entirely at the user's own risk.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Changes to Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms at any time. Updated versions will be posted on this page and continued use of the website means you accept the updated terms.
                </p>
              </div>
            </div>
          </section>

          {/* Privacy Policy Section */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary border-b border-border pb-2">Privacy Policy</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Introduction</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Fynix Logs respects your privacy and is committed to protecting your personal information. This policy explains how we collect, use, and safeguard your data.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Information We Collect</h3>
                <p className="text-muted-foreground leading-relaxed">
                  When you use our website, we may collect the following information: Name, Email address, Phone number, Payment information, and Account activity on our website. This information is collected only when necessary to provide our services.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">How We Use Your Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your information may be used to process orders and transactions, provide customer support, improve our website and services, and communicate important updates regarding purchases. We do not sell or rent user information to third parties.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Payment Security</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Payments on our platform may be processed through secure third-party payment processors such as Korapay or other authorized payment providers. These processors handle payment data securely according to their own privacy policies.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Data Protection</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We take reasonable steps to protect user data from unauthorized access, misuse, or disclosure. However, no online system can guarantee complete security.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Third-Party Services</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our website may use third-party tools or services. These services operate under their own privacy policies and Fynix Logs is not responsible for their practices.
                </p>
              </div>
            </div>
          </section>

          {/* Refund Policy Section */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary border-b border-border pb-2">Refund Policy</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Digital Products Policy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Fynix Logs sells digital goods. Due to the nature of digital products, most purchases are non-refundable once delivered. However, we provide a limited warranty for certain products.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Account Warranty</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All accounts purchased from Fynix Logs include a 1-hour warranty period starting immediately after purchase. During this time, customers may report issues such as incorrect login details, non-working accounts, or accounts inaccessible at delivery.
                </p>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  If the issue is verified within the warranty period, we may provide a replacement account, or a refund/store credit depending on the situation.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Warranty Limitations</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The 1-hour warranty becomes void if:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                  <li>The buyer changes account details such as password, email, or username</li>
                  <li>The account becomes restricted due to buyer actions</li>
                  <li>The warranty period has expired</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg">No Refund After Warranty Period</h3>
                <p className="text-muted-foreground leading-relaxed">
                  After the 1-hour warranty window has passed, Fynix Logs cannot guarantee replacements or refunds.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
