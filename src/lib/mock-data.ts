import type { LucideIcon } from "lucide-react";
import {
  Scissors,
  Sparkles,
  Flower2,
  Brush,
  Eye,
  HandHeart,
  Waves,
  Venus,
  Droplets,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { distanceKm, postalCodeGeo } from "@/lib/geo";

export type TreatmentId =
  | "haircut"
  | "coloring"
  | "perm"
  | "beard"
  | "nails"
  | "pedicure"
  | "facial"
  | "waxing"
  | "massage"
  | "makeup"
  | "lashes";

export type TreatmentDef = {
  id: TreatmentId;
  icon: LucideIcon;
  /** Core treatments always show in the public filter; others only unlock once a salon offers them. */
  core: boolean;
};

export const treatmentDefs: TreatmentDef[] = [
  { id: "haircut", icon: Scissors, core: true },
  { id: "coloring", icon: Sparkles, core: true },
  { id: "perm", icon: Waves, core: true },
  { id: "beard", icon: Brush, core: true },
  { id: "nails", icon: HandHeart, core: false },
  { id: "pedicure", icon: Droplets, core: false },
  { id: "facial", icon: Flower2, core: false },
  { id: "waxing", icon: Eye, core: false },
  { id: "massage", icon: Waves, core: false },
  { id: "makeup", icon: Venus, core: false },
  { id: "lashes", icon: Eye, core: false },
];

export function treatmentLabel(t: Dictionary, id: TreatmentId): string {
  return t.treatments[id];
}

/** Core treatments plus any non-core treatment offered by at least one salon in `pool`. */
export function unlockedTreatments(pool: Salon[]): TreatmentDef[] {
  const offered = new Set(pool.flatMap((s) => s.treatments));
  return treatmentDefs.filter((def) => def.core || offered.has(def.id));
}

export type SalonCategory = "barber" | "friseur" | "kosmetik" | "nagelstudio" | "spa";

export const salonCategories: SalonCategory[] = ["barber", "friseur", "kosmetik", "nagelstudio", "spa"];

export function categoryLabel(t: Dictionary, category: SalonCategory): string {
  return t.categories[category];
}

export type Salon = {
  id: string;
  name: string;
  category: SalonCategory;
  treatments: TreatmentId[];
  city: string;
  /** Used for the "within X km" search filter via postalCodeGeo in src/lib/geo.ts. */
  postalCode: string;
  rating: number;
  reviews: number;
  priceLevel: 1 | 2 | 3;
  badge?: string;
  nextSlot: string;
  gradient: string;
};

export const salons: Salon[] = [
  {
    id: "obsidian-cuts",
    name: "Obsidian Cuts",
    category: "friseur",
    treatments: ["haircut", "coloring", "beard"],
    city: "Berlin — Mitte",
    postalCode: "10115",
    rating: 4.9,
    reviews: 612,
    priceLevel: 3,
    badge: "Top bewertet",
    nextSlot: "Heute, 16:30",
    gradient: "from-[#1f2a24] via-[#2f4a3b] to-[#c9b28a]",
  },
  {
    id: "atelier-lune",
    name: "Atelier Lune",
    category: "kosmetik",
    treatments: ["facial", "waxing"],
    city: "Hamburg — Eppendorf",
    postalCode: "20249",
    rating: 4.8,
    reviews: 389,
    priceLevel: 2,
    badge: "Neu auf Appointy",
    nextSlot: "Morgen, 10:00",
    gradient: "from-[#2a2420] via-[#7c6a4f] to-[#e7d9b8]",
  },
  {
    id: "maison-nail",
    name: "Maison Nail Studio",
    category: "nagelstudio",
    treatments: ["nails", "pedicure"],
    city: "München — Glockenbach",
    postalCode: "80469",
    rating: 4.7,
    reviews: 274,
    priceLevel: 2,
    nextSlot: "Heute, 18:15",
    gradient: "from-[#241d2b] via-[#4a3b5c] to-[#d8c3a5]",
  },
  {
    id: "verde-barber",
    name: "Verde Barber Co.",
    category: "barber",
    treatments: ["haircut", "beard", "perm"],
    city: "Köln — Ehrenfeld",
    postalCode: "50823",
    rating: 4.9,
    reviews: 501,
    priceLevel: 2,
    badge: "Vielgebucht",
    nextSlot: "Fr, 09:30",
    gradient: "from-[#1a2420] via-[#2d5a44] to-[#a9c3a0]",
  },
  {
    id: "the-brow-house",
    name: "The Brow House",
    category: "kosmetik",
    treatments: ["lashes", "facial"],
    city: "Frankfurt — Westend",
    postalCode: "60323",
    rating: 4.6,
    reviews: 198,
    priceLevel: 1,
    nextSlot: "Heute, 14:00",
    gradient: "from-[#231d1a] via-[#6b4a3a] to-[#e3bfa0]",
  },
  {
    id: "sequoia-spa",
    name: "Sequoia Spa & Wellness",
    category: "spa",
    treatments: ["massage", "facial"],
    city: "Stuttgart — West",
    postalCode: "70197",
    rating: 5.0,
    reviews: 156,
    priceLevel: 3,
    badge: "Editor's Pick",
    nextSlot: "Sa, 11:45",
    gradient: "from-[#161f1c] via-[#25443a] to-[#bfae8a]",
  },
  // Real barbershops within ~20 km of 91757 Treuchtlingen, for local testing.
  // Names/addresses/ratings pulled from public listings (Sep 2026) — treat ratings
  // and review counts as best-effort, not a verified live feed. Everything else
  // (nextSlot, priceLevel, gradient) is illustrative mock data like the rest of this file.
  {
    id: "kingsman-barbershop",
    name: "Kingsman Barbershop",
    category: "barber",
    treatments: ["haircut", "beard"],
    city: "Treuchtlingen — Hauptstraße",
    postalCode: "91757",
    rating: 4.9,
    reviews: 158,
    priceLevel: 2,
    badge: "Top bewertet",
    nextSlot: "Heute, 15:00",
    gradient: "from-[#1c1c1f] via-[#3a3a40] to-[#b8a888]",
  },
  {
    id: "barbier-jefferson",
    name: "Barbier Jefferson",
    category: "barber",
    treatments: ["haircut", "beard"],
    city: "Weißenburg in Bayern",
    postalCode: "91781",
    rating: 4.9,
    reviews: 492,
    priceLevel: 2,
    badge: "Top bewertet",
    nextSlot: "Morgen, 09:30",
    gradient: "from-[#191d1a] via-[#33443a] to-[#c7b590]",
  },
  {
    id: "altstadt-barbershop",
    name: "Altstadt Barbershop",
    category: "barber",
    treatments: ["haircut", "beard"],
    city: "Weißenburg in Bayern",
    postalCode: "91781",
    rating: 4.9,
    reviews: 504,
    priceLevel: 2,
    nextSlot: "Heute, 17:45",
    gradient: "from-[#20191a] via-[#4a3230] to-[#caa07c]",
  },
  {
    id: "starcut-gunzenhausen",
    name: "STARCUT Razor Hairdesign",
    category: "barber",
    treatments: ["haircut", "beard"],
    city: "Gunzenhausen",
    postalCode: "91710",
    rating: 4.7,
    reviews: 34,
    priceLevel: 2,
    nextSlot: "Sa, 10:00",
    gradient: "from-[#15181f] via-[#2b3648] to-[#8fa5c2]",
  },
  {
    id: "alex-barber-shop",
    name: "Alex Barber Shop",
    category: "barber",
    treatments: ["haircut", "beard"],
    city: "Gunzenhausen",
    postalCode: "91710",
    rating: 4.6,
    reviews: 76,
    priceLevel: 2,
    nextSlot: "Heute, 12:30",
    gradient: "from-[#1a1a1a] via-[#3d3d3d] to-[#b0a48f]",
  },
];

export type SalonFilter = {
  category: SalonCategory | null;
  /** Free-typed city name or postal code from the search bar. */
  location: string;
};

/**
 * Filters salons by category and, when `location` matches a postal code we have
 * coordinates for (see postalCodeGeo), by real distance (<= 20 km). Otherwise
 * `location` falls back to a plain substring match against `city`/`postalCode`.
 */
export function filterSalons(pool: Salon[], filter: SalonFilter, radiusKm = 20): Salon[] {
  let result = pool;

  if (filter.category) {
    result = result.filter((s) => s.category === filter.category);
  }

  const query = filter.location.trim();
  if (query) {
    const origin = postalCodeGeo[query];
    if (origin) {
      result = result.filter((s) => {
        const target = postalCodeGeo[s.postalCode];
        return target ? distanceKm(origin, target) <= radiusKm : false;
      });
    } else {
      const q = query.toLowerCase();
      result = result.filter(
        (s) => s.city.toLowerCase().includes(q) || s.postalCode.includes(q)
      );
    }
  }

  return result;
}

export const partnerStats = [
  { key: "statNoShows", value: 38, suffix: "%" },
  { key: "statSalons", value: 12400, suffix: "+" },
  { key: "statRating", value: 4.8, suffix: "★" },
  { key: "statAvailability", value: 24, suffix: "/7" },
] as const;

// --- B2B onboarding: master treatment list is `treatmentDefs` above; custom entries are free text.

// --- Salon dashboard mock state -------------------------------------------------

export type StaffMember = {
  id: string;
  name: string;
  treatments: TreatmentId[];
  calendarConnected: boolean;
  availability: ("free" | "busy" | "off")[]; // next 7 days, simplified
};

export const staffMembers: StaffMember[] = [
  {
    id: "staff-1",
    name: "Jana Keller",
    treatments: ["haircut", "coloring"],
    calendarConnected: true,
    availability: ["free", "busy", "free", "free", "busy", "off", "free"],
  },
  {
    id: "staff-2",
    name: "Marco Vetter",
    treatments: ["beard", "haircut"],
    calendarConnected: true,
    availability: ["busy", "free", "free", "off", "free", "free", "busy"],
  },
  {
    id: "staff-3",
    name: "Lea Brandt",
    treatments: ["facial", "waxing"],
    calendarConnected: false,
    availability: ["free", "free", "off", "free", "busy", "free", "free"],
  },
];

export type SmsLogEntry = {
  id: string;
  timestamp: string;
  customer: string;
  treatment: TreatmentId;
  time: string;
  phone: string;
};

export const smsLog: SmsLogEntry[] = [
  { id: "sms-1", timestamp: "Heute, 09:14", customer: "Nadine H.", treatment: "haircut", time: "Heute, 16:30", phone: "+49 151 2345 6781" },
  { id: "sms-2", timestamp: "Heute, 08:02", customer: "Elif T.", treatment: "coloring", time: "Morgen, 11:00", phone: "+49 176 9988 1122" },
  { id: "sms-3", timestamp: "Gestern, 19:47", customer: "Paul S.", treatment: "beard", time: "Fr, 09:30", phone: "+49 152 4432 8890" },
  { id: "sms-4", timestamp: "Gestern, 14:20", customer: "Mira K.", treatment: "coloring", time: "Sa, 13:00", phone: "+49 160 7712 3345" },
];

export const dashboardStats = {
  todayBookings: 14,
  weekRevenueEur: 3260,
  utilizationPercent: 78,
  newCustomers: 9,
};

// --- Super-admin mock state -------------------------------------------------

export type AdminSalon = {
  id: string;
  name: string;
  industry: string;
  status: "active" | "pending" | "suspended";
  bookingsThisMonth: number;
};

export const adminSalons: AdminSalon[] = [
  { id: "a1", name: "Obsidian Cuts", industry: "Barbershop", status: "active", bookingsThisMonth: 214 },
  { id: "a2", name: "Atelier Lune", industry: "Kosmetikstudio", status: "active", bookingsThisMonth: 132 },
  { id: "a3", name: "Maison Nail Studio", industry: "Nagelstudio", status: "pending", bookingsThisMonth: 0 },
  { id: "a4", name: "Verde Barber Co.", industry: "Barbershop", status: "active", bookingsThisMonth: 189 },
  { id: "a5", name: "The Brow House", industry: "Kosmetikstudio", status: "active", bookingsThisMonth: 97 },
  { id: "a6", name: "Sequoia Spa & Wellness", industry: "Spa & Wellness", status: "suspended", bookingsThisMonth: 12 },
  { id: "a7", name: "Nordlicht Hair Lounge", industry: "Friseursalon", status: "pending", bookingsThisMonth: 0 },
];

export const adminStats = {
  mrrEur: 84200,
  totalBookings: 128430,
  smsSent: 41870,
  smsCostEur: 2094,
};
