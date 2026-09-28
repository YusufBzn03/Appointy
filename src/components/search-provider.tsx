"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { salons, filterSalons, type Salon, type SalonCategory } from "@/lib/mock-data";
import { SearchTransitionOverlay } from "@/components/search-transition-overlay";

type SearchContextValue = {
  category: SalonCategory | null;
  setCategory: (category: SalonCategory | null) => void;
  location: string;
  setLocation: (location: string) => void;
  results: Salon[];
  isFiltered: boolean;
  reset: () => void;
  /** Navigates to /salons with the current filters, showing a brief transition first. */
  submitSearch: () => void;
};

const SearchContext = React.createContext<SearchContextValue | null>(null);

const TRANSITION_MS = 650;

export function SearchProvider({
  children,
  initialCategory = null,
  initialLocation = "",
}: {
  children: React.ReactNode;
  initialCategory?: SalonCategory | null;
  initialLocation?: string;
}) {
  const router = useRouter();
  const [category, setCategory] = React.useState<SalonCategory | null>(initialCategory);
  const [location, setLocation] = React.useState(initialLocation);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const results = React.useMemo(
    () => filterSalons(salons, { category, location }),
    [category, location]
  );

  const submitSearch = React.useCallback(() => {
    setIsNavigating(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (location.trim()) params.set("location", location.trim());
    const query = params.toString();
    setTimeout(() => {
      router.push(query ? `/salons?${query}` : "/salons");
    }, TRANSITION_MS);
  }, [category, location, router]);

  const value = React.useMemo<SearchContextValue>(
    () => ({
      category,
      setCategory,
      location,
      setLocation,
      results,
      isFiltered: category !== null || location.trim() !== "",
      reset: () => {
        setCategory(null);
        setLocation("");
      },
      submitSearch,
    }),
    [category, location, results, submitSearch]
  );

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchTransitionOverlay show={isNavigating} />
    </SearchContext.Provider>
  );
}

export function useSalonSearch() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error("useSalonSearch must be used within a SearchProvider");
  return ctx;
}
