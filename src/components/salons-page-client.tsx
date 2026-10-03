"use client";

import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SalonShowcase } from "@/components/salon-showcase";
import { SiteFooter } from "@/components/site-footer";
import { SearchProvider } from "@/components/search-provider";
import type { SalonCategory, TimeWindow } from "@/lib/mock-data";

const validCategories: SalonCategory[] = ["barber", "friseur", "kosmetik", "nagelstudio", "spa"];

export function SalonsPageClient() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const initialCategory = validCategories.includes(categoryParam as SalonCategory)
    ? (categoryParam as SalonCategory)
    : null;
  const initialLocation = searchParams.get("location") ?? "";
  const dateParam = searchParams.get("date") ?? "";
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : "";
  const windowParam = searchParams.get("window");
  const initialWindow: TimeWindow = ["morning", "afternoon", "evening"].includes(windowParam ?? "")
    ? (windowParam as TimeWindow)
    : "any";
  const [lat, lng] = (searchParams.get("near") ?? "").split(",").map(Number);
  const initialCoords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  return (
    <SearchProvider
      initialCategory={initialCategory}
      initialLocation={initialLocation}
      initialDate={initialDate}
      initialWindow={initialWindow}
      initialCoords={initialCoords}
    >
      <SiteHeader />
      <main className="flex-1 pt-32">
        <SalonShowcase />
      </main>
      <SiteFooter />
    </SearchProvider>
  );
}
