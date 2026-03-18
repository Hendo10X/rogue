import HeroSection from "@/components/hero";
import { Navbar } from "@/components/navbar";
import Features from "@/components/features";
import HowItWorks from "@/components/howitworks";
import WhyChooseUs from "@/components/whychoseus";
import PaymentMethods from "@/components/payment-methods";
import FAQs from "@/components/FAQs";
import Footer from "@/components/Footer";
import { getSetting } from "@/lib/admin-auth";
import { AnnouncementBanner } from "@/components/announcement-banner";

export const dynamic = "force-dynamic";

export default async function Home() {
  const announcementStr = await getSetting("site_announcement");
  const announcement = announcementStr ? JSON.parse(announcementStr) : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05021a]">
      {/* Layered depth: large ambient orbs at different depths */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 left-1/4 h-[700px] w-[700px] rounded-full bg-purple-700/8 blur-[180px]" />
        <div className="absolute top-[60%] -right-40 h-[550px] w-[550px] rounded-full bg-violet-600/6 blur-[160px]" />
        <div className="absolute top-[30%] -left-60 h-[400px] w-[400px] rounded-full bg-fuchsia-700/5 blur-[140px]" />
        <div className="absolute -bottom-20 right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-800/6 blur-[170px]" />
      </div>

      {/* SVG hexagonal pattern - different from prev grid */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
              <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="#a78bfa" strokeWidth="0.4" />
              <path d="M28 0L28 -34L0 -50L0 -16L28 0" fill="none" stroke="#a78bfa" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>
      </div>

      {/* Floating particle dots */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="scatter" width="200" height="200" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="30" r="1.2" fill="#c084fc" />
              <circle cx="80" cy="150" r="0.8" fill="#a855f7" />
              <circle cx="150" cy="60" r="1" fill="#8b5cf6" />
              <circle cx="180" cy="180" r="0.6" fill="#c084fc" />
              <circle cx="50" cy="100" r="0.9" fill="#7c3aed" />
              <circle cx="130" cy="20" r="0.7" fill="#a78bfa" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#scatter)" />
        </svg>
      </div>

      <Navbar />
      <div className="relative z-10 pt-22 lg:pt-22">
        {announcement && announcement.active && (
          <AnnouncementBanner announcement={announcement} />
        )}
        <HeroSection />
        <Features />
        <PaymentMethods />
        <HowItWorks />
        <WhyChooseUs />
        <FAQs />
        <Footer />
      </div>
    </div>
  );
}
