"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/components/auth-provider";
import { useSalonData } from "@/components/salon-data-provider";
import { useLocale } from "@/components/locale-provider";
import { useSalonSearch } from "@/components/search-provider";
import {
  unlockedTreatments,
  treatmentDefs,
  treatmentLabel,
  salonCategories,
  categoryLabel,
  type SalonCategory,
} from "@/lib/mock-data";

export function SiteHeader() {
  const { t } = useLocale();
  const { category, setCategory, location, setLocation, submitSearch } = useSalonSearch();
  const { scrollY } = useScroll();
  const categoryOpacity = useTransform(scrollY, [0, 140], [1, 0]);
  const categoryHeight = useTransform(scrollY, [0, 140], [44, 0]);
  const [authTab, setAuthTab] = React.useState<"customer" | "salon" | null>(null);

  const { salons, availableTreatmentIds } = useSalonData();
  const { session, signOut } = useAuth();
  // Live data: the available_treatments view decides; mock data derives the same rule from the salons.
  const treatments = React.useMemo(
    () =>
      availableTreatmentIds
        ? treatmentDefs.filter((d) => availableTreatmentIds.includes(d.id))
        : unlockedTreatments(salons),
    [availableTreatmentIds, salons]
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-heading text-lg tracking-tight">Appointy</span>
          </Link>

          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 shadow-sm transition-shadow focus-within:shadow-md">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Select
                value={category ?? "all"}
                onValueChange={(value) =>
                  setCategory(!value || value === "all" ? null : (value as SalonCategory))
                }
              >
                <SelectTrigger className="h-7 w-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 [&_svg]:ml-auto">
                  <SelectValue>
                    {(value: SalonCategory | "all") =>
                      value === "all" ? t.hero.searchService : categoryLabel(t, value)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.categories.all}</SelectItem>
                  {salonCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(t, c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="h-4 w-px shrink-0 bg-border" />
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <LocationAutocomplete
                value={location}
                onChange={setLocation}
                onSubmit={submitSearch}
                placeholder={t.hero.searchCity}
                className="h-7 w-32 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => (session ? signOut() : setAuthTab("customer"))}
            >
              {session ? t.auth.signOut : t.nav.login}
            </Button>
            <Button size="sm" className="rounded-full" onClick={() => setAuthTab("salon")}>
              {t.nav.becomePartner}
            </Button>
          </div>
        </div>

        <motion.div
          style={{ opacity: categoryOpacity, height: categoryHeight }}
          className="hidden overflow-hidden md:block"
        >
          <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
            {treatments.map((treatment) => (
              <Link
                key={treatment.id}
                href={`#${treatment.id}`}
                className="group flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <treatment.icon className="size-3.5" />
                {treatmentLabel(t, treatment.id)}
              </Link>
            ))}
          </nav>
        </motion.div>
      </div>

      <AuthModal
        open={authTab !== null}
        onOpenChange={(open) => setAuthTab(open ? authTab ?? "customer" : null)}
        defaultTab={authTab ?? "customer"}
      />
    </header>
  );
}
