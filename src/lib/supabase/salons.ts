import { supabase } from "@/lib/supabase/client";
import type { Salon, SalonCategory, TreatmentId } from "@/lib/mock-data";

type SalonRow = {
  id: string;
  name: string;
  category: SalonCategory;
  city: string;
  postal_code: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number | null;
  price_level: 1 | 2 | 3 | null;
  badge: string | null;
  salon_treatments: { treatment_id: TreatmentId }[];
};

// Salons without photos get one of the editorial duotone gradients, stable per salon id.
const gradients = [
  "from-[#1a1a1a] via-[#3d3d3d] to-[#b0a48f]",
  "from-[#0f3d2e] via-[#1f6b52] to-[#d8c9a3]",
  "from-[#3b2a20] via-[#7a5a44] to-[#e6d5b8]",
  "from-[#24303f] via-[#4a5d78] to-[#cfd6df]",
];

function gradientFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return gradients[h % gradients.length];
}

/** Active salons (RLS already restricts anon/customers to `status = 'active'`). Throws on query errors. */
export async function fetchSalons(): Promise<Salon[]> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("salons")
    .select(
      "id, name, category, city, postal_code, lat, lng, rating, review_count, price_level, badge, salon_treatments(treatment_id)"
    )
    .eq("status", "active")
    .order("rating", { ascending: false, nullsFirst: false });
  if (error) throw error;

  return (data as unknown as SalonRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    treatments: r.salon_treatments.map((t) => t.treatment_id),
    city: r.city,
    postalCode: r.postal_code,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    rating: r.rating ?? 0,
    reviews: r.review_count ?? 0,
    priceLevel: r.price_level ?? 2,
    badge: r.badge ?? undefined,
    nextSlot: "", // computed from busy_slots() once the booking flow is wired
    gradient: gradientFor(r.id),
  }));
}

/** Earliest free start per salon id (ISO), from the next_free_slots() RPC. Salons without a slot are omitted. */
export async function fetchNextSlots(salonIds: string[]): Promise<Record<string, string>> {
  if (!supabase || salonIds.length === 0) return {};
  const { data, error } = await supabase.rpc("next_free_slots", { p_salon_ids: salonIds });
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const r of data as { salon_id: string; slot: string | null }[]) if (r.slot) out[r.salon_id] = r.slot;
  return out;
}

/** Ids from the available_treatments view: core treatments plus niche ones some active salon offers. */
export async function fetchAvailableTreatmentIds(): Promise<TreatmentId[]> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.from("available_treatments").select("id").order("sort");
  if (error) throw error;
  return (data as { id: TreatmentId }[]).map((r) => r.id);
}
