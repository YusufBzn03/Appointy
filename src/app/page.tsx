import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { PartnerShowcase } from "@/components/partner-showcase";
import { CustomersSection } from "@/components/customers-section";
import { PartnersSection } from "@/components/partners-section";
import { SiteFooter } from "@/components/site-footer";
import { SearchProvider } from "@/components/search-provider";

export default function Home() {
  return (
    <SearchProvider>
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <PartnerShowcase />
        <CustomersSection />
        <PartnersSection />
      </main>
      <SiteFooter />
    </SearchProvider>
  );
}
