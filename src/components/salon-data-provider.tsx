"use client";

import * as React from "react";
import { salons as mockSalons, type Salon, type TreatmentId } from "@/lib/mock-data";
import { fetchSalons, fetchNextSlots, fetchAvailableTreatmentIds } from "@/lib/supabase/salons";
import { supabase } from "@/lib/supabase/client";

type SalonData = {
  salons: Salon[];
  source: "supabase" | "mock";
  loading: boolean;
  /** From the available_treatments view; null while loading or on mock data (callers derive it from salons). */
  availableTreatmentIds: TreatmentId[] | null;
  /** Re-query salons' next free slots now (e.g. right after a booking). */
  refreshSlots: () => void;
};

const SLOT_POLL_MS = 60_000;

const SalonDataContext = React.createContext<SalonData>({
  salons: mockSalons,
  source: "mock",
  loading: false,
  availableTreatmentIds: null,
  refreshSlots: () => {},
});

/**
 * Single source of salon data for the whole app: live Supabase rows when the env vars are set,
 * otherwise (or if the query fails) the mock list, so the UI never renders empty because of the backend.
 * "Next free slot" is refreshed every minute and after each booking.
 */
export function SalonDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<Omit<SalonData, "refreshSlots">>({
    salons: mockSalons,
    source: "mock",
    loading: supabase !== null,
    availableTreatmentIds: null,
  });
  const [slotTick, setSlotTick] = React.useState(0);

  React.useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    Promise.all([fetchSalons(), fetchAvailableTreatmentIds()])
      .then(([salons, availableTreatmentIds]) => {
        if (!cancelled) setState({ salons, source: "supabase", loading: false, availableTreatmentIds });
      })
      .catch((err) => {
        console.error("Falling back to mock salons:", err);
        if (!cancelled) setState({ salons: mockSalons, source: "mock", loading: false, availableTreatmentIds: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveIds = React.useMemo(
    () => (state.source === "supabase" ? state.salons.map((s) => s.id).join(",") : ""),
    [state.source, state.salons]
  );

  // Poll next_free_slots for live salons; also re-runs when refreshSlots() bumps slotTick.
  React.useEffect(() => {
    if (!liveIds) return;
    let cancelled = false;
    const load = () =>
      fetchNextSlots(liveIds.split(","))
        .then((slots) => {
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            salons: prev.salons.map((s) => ({ ...s, nextSlotAt: slots[s.id] })),
          }));
        })
        .catch((err) => console.error("next_free_slots failed:", err));
    load();
    const timer = setInterval(load, SLOT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [liveIds, slotTick]);

  const refreshSlots = React.useCallback(() => setSlotTick((n) => n + 1), []);
  const value = React.useMemo(() => ({ ...state, refreshSlots }), [state, refreshSlots]);

  return <SalonDataContext.Provider value={value}>{children}</SalonDataContext.Provider>;
}

export function useSalonData() {
  return React.useContext(SalonDataContext);
}
