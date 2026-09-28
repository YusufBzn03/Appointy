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
} from "lucide-react";

export type Category = {
  slug: string;
  label: string;
  icon: LucideIcon;
};

export const categories: Category[] = [
  { slug: "haare", label: "Haare", icon: Scissors },
  { slug: "bart", label: "Bart & Rasur", icon: Brush },
  { slug: "nails", label: "Nails", icon: HandHeart },
  { slug: "wimpern", label: "Wimpern & Brows", icon: Eye },
  { slug: "kosmetik", label: "Kosmetik", icon: Sparkles },
  { slug: "spa", label: "Spa & Wellness", icon: Waves },
  { slug: "makeup", label: "Makeup", icon: Venus },
  { slug: "floral", label: "Bridal", icon: Flower2 },
];

export type Salon = {
  id: string;
  name: string;
  category: string;
  city: string;
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
    category: "Haare",
    city: "Berlin — Mitte",
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
    category: "Kosmetik",
    city: "Hamburg — Eppendorf",
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
    category: "Nails",
    city: "München — Glockenbach",
    rating: 4.7,
    reviews: 274,
    priceLevel: 2,
    nextSlot: "Heute, 18:15",
    gradient: "from-[#241d2b] via-[#4a3b5c] to-[#d8c3a5]",
  },
  {
    id: "verde-barber",
    name: "Verde Barber Co.",
    category: "Bart & Rasur",
    city: "Köln — Ehrenfeld",
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
    category: "Wimpern & Brows",
    city: "Frankfurt — Westend",
    rating: 4.6,
    reviews: 198,
    priceLevel: 1,
    nextSlot: "Heute, 14:00",
    gradient: "from-[#231d1a] via-[#6b4a3a] to-[#e3bfa0]",
  },
  {
    id: "sequoia-spa",
    name: "Sequoia Spa & Wellness",
    category: "Spa & Wellness",
    city: "Stuttgart — West",
    rating: 5.0,
    reviews: 156,
    priceLevel: 3,
    badge: "Editor's Pick",
    nextSlot: "Sa, 11:45",
    gradient: "from-[#161f1c] via-[#25443a] to-[#bfae8a]",
  },
];

export const bookingSteps = [
  {
    step: "01",
    title: "Service wählen",
    description: "Haarschnitt, Coloration, Maniküre — filtere nach dem, was du wirklich brauchst.",
  },
  {
    step: "02",
    title: "Zeit finden",
    description: "Freie Slots in Echtzeit, sortiert nach Nähe, Bewertung und Verfügbarkeit heute.",
  },
  {
    step: "03",
    title: "Bestätigen",
    description: "Ein Klick, eine Bestätigung per SMS & E-Mail. Kostenlos stornierbar bis 24h vorher.",
  },
] as const;

export const partnerStats = [
  { value: 38, suffix: "%", label: "weniger No-Shows durch automatische Erinnerungen" },
  { value: 12400, suffix: "+", label: "Salons & Studios vertrauen auf Appointy" },
  { value: 4.8, suffix: "★", label: "durchschnittliche Kundenbewertung" },
  { value: 24, suffix: "/7", label: "Online-Buchung ohne Telefonanrufe" },
] as const;

export const partnerFeatures = [
  {
    title: "Intelligenter Kalender",
    description: "Alle Mitarbeitenden, Räume und Ressourcen in einer Ansicht — synchronisiert in Echtzeit.",
  },
  {
    title: "Automatische Erinnerungen",
    description: "SMS & E-Mail-Erinnerungen senken No-Shows nachweislich um über ein Drittel.",
  },
  {
    title: "Umsatz-Insights",
    description: "Auslastung, Stammkund:innen und Umsatztrends auf einen Blick — ganz ohne Excel.",
  },
] as const;
