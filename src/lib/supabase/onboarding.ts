import { supabase } from "@/lib/supabase/client";
import { postalCodeGeo } from "@/lib/geo";
import type { SalonCategory, TreatmentId } from "@/lib/mock-data";

export type OnboardingInput = {
  name: string;
  /** Free text like "Musterstraße 12, 10115 Berlin". */
  address: string;
  phone: string;
  website?: string;
  treatments: TreatmentId[];
  hours: { days: number[]; opens: string; closes: string };
  staff: string[];
  notifications: { push: boolean; sms: boolean; email: boolean };
};

/** "Musterstraße 12, 10115 Berlin" -> { street, postalCode, city }; null if no 5-digit PLZ + city. */
export function parseAddress(address: string) {
  const m = address.match(/^(.*?)[,\s]*\b(\d{5})\s+(.+?)\s*$/);
  if (!m) return null;
  return { street: m[1].trim(), postalCode: m[2], city: m[3].trim() };
}

/** The wizard has no explicit business-type step, so infer the directory category from the offering. */
export function inferCategory(treatments: TreatmentId[]): SalonCategory {
  const has = (...ids: TreatmentId[]) => ids.some((id) => treatments.includes(id));
  if (has("nails", "pedicure")) return "nagelstudio";
  if (has("massage")) return "spa";
  if (has("facial", "waxing", "lashes", "makeup")) return "kosmetik";
  if (has("beard") && !has("coloring", "perm")) return "barber";
  return "friseur";
}

/** Creates salon, treatments, opening hours, staff and notification settings atomically (RPC onboard_salon). */
export async function submitOnboarding(input: OnboardingInput): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const addr = parseAddress(input.address);
  if (!addr) throw new Error("address needs a 5-digit postal code and a city");
  const geo = postalCodeGeo[addr.postalCode];

  const { data, error } = await supabase.rpc("onboard_salon", {
    p: {
      name: input.name,
      category: inferCategory(input.treatments),
      street: addr.street,
      postal_code: addr.postalCode,
      city: addr.city,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      phone: input.phone,
      website: input.website ?? null,
      treatments: input.treatments,
      hours: input.hours,
      staff: input.staff,
      notifications: input.notifications,
    },
  });
  if (error) throw error;
  return data as string;
}
