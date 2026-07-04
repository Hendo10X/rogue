import HeroSection from "@/components/hero";
import { Navbar } from "@/components/navbar";
import Features from "@/components/features";
import HowItWorks from "@/components/howitworks";
import WhyChooseUs from "@/components/whychoseus";
import FAQs from "@/components/FAQs";
import Footer from "@/components/Footer";
import { getSetting } from "@/lib/admin-auth";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { FAQ_ITEMS } from "@/lib/faq";

export const dynamic = "force-dynamic";

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default async function Home() {
  const announcementStr = await getSetting("site_announcement");
  const announcement = announcementStr ? JSON.parse(announcementStr) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      {announcement && announcement.active && (
        <AnnouncementBanner announcement={announcement} />
      )}
      <Navbar />
      <HeroSection />
      <Features />
      <HowItWorks />
      <WhyChooseUs />
      <FAQs />
      <Footer />
    </>
  );
}
