"use client";

import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SalonShowcase } from "@/components/salon-showcase";
import { SiteFooter } from "@/components/site-footer";
import { SearchProvider } from "@/components/search-provider";
import type { SalonCategory } from "@/lib/mock-data";

const validCategories: SalonCategory[] = ["barber", "friseur", "kosmetik", "nagelstudio", "spa"];

export function SalonsPageClient() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const initialCategory = validCategories.includes(categoryParam as SalonCategory)
    ? (categoryParam as SalonCategory)
    : null;
  const initialLocation = searchParams.get("location") ?? "";

  return (
    <SearchProvider initialCategory={initialCategory} initialLocation={initialLocation}>
      <SiteHeader />
      <main className="flex-1 pt-32">
        <SalonShowcase />
      </main>
      <SiteFooter />
    </SearchProvider>
  );
}
