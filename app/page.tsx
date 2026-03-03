import HeroSection from "@/components/hero";
import { Navbar } from "@/components/navbar";
import Features from "@/components/features";
import HowItWorks from "@/components/howitworks";
import WhyChooseUs from "@/components/whychoseus";
import FAQs from "@/components/FAQs";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
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
