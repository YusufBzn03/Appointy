import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { CustomersSection } from "@/components/customers-section";
import { PartnersSection } from "@/components/partners-section";
import { SalonShowcase } from "@/components/salon-showcase";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <CustomersSection />
        <PartnersSection />
        <SalonShowcase />
      </main>
      <SiteFooter />
    </>
  );
}
