"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { filterSalons, type Salon, type SalonCategory, type TimeWindow } from "@/lib/mock-data";
import type { GeoPoint } from "@/lib/geo";
import { useSalonData } from "@/components/salon-data-provider";
import { SearchTransitionOverlay } from "@/components/search-transition-overlay";

type SearchContextValue = {
  category: SalonCategory | null;
  setCategory: (category: SalonCategory | null) => void;
  location: string;
  setLocation: (location: string) => void;
  date: string;
  setDate: (date: string) => void;
  window: TimeWindow;
  setWindow: (window: TimeWindow) => void;
  /** Set via "In deiner Nähe"; cleared as soon as the user types a location. */
  coords: GeoPoint | null;
  setCoords: (coords: GeoPoint | null) => void;
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
  initialDate = "",
  initialWindow = "any",
  initialCoords = null,
}: {
  children: React.ReactNode;
  initialCategory?: SalonCategory | null;
  initialLocation?: string;
  initialDate?: string;
  initialWindow?: TimeWindow;
  initialCoords?: GeoPoint | null;
}) {
  const router = useRouter();
  const { salons } = useSalonData();
  const [category, setCategory] = React.useState<SalonCategory | null>(initialCategory);
  const [location, setLocationState] = React.useState(initialLocation);
  const [date, setDate] = React.useState(initialDate);
  const [window, setWindow] = React.useState<TimeWindow>(initialWindow);
  const [coords, setCoords] = React.useState<GeoPoint | null>(initialCoords);
  const setLocation = React.useCallback((value: string) => {
    setLocationState(value);
    if (value) setCoords(null);
  }, []);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const results = React.useMemo(
    () => filterSalons(salons, { category, location, origin: coords, date, window }),
    [salons, category, location, coords, date, window]
  );

  const submitSearch = React.useCallback(() => {
    setIsNavigating(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (location.trim()) params.set("location", location.trim());
    if (coords) params.set("near", `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`);
    if (date) params.set("date", date);
    if (window !== "any") params.set("window", window);
    const query = params.toString();
    setTimeout(() => {
      router.push(query ? `/salons?${query}` : "/salons");
    }, TRANSITION_MS);
  }, [category, location, coords, date, window, router]);

  const value = React.useMemo<SearchContextValue>(
    () => ({
      category,
      setCategory,
      location,
      setLocation,
      date,
      setDate,
      window,
      setWindow,
      coords,
      setCoords,
      results,
      isFiltered:
        category !== null || location.trim() !== "" || coords !== null || date !== "" || window !== "any",
      reset: () => {
        setCategory(null);
        setLocation("");
        setCoords(null);
        setDate("");
        setWindow("any");
      },
      submitSearch,
    }),
    [category, location, setLocation, date, window, coords, results, submitSearch]
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
