"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Search,
  MapPin,
  CalendarDays,
  ArrowRight,
  Star,
  Clock,
  LocateFixed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import { useSalonSearch } from "@/components/search-provider";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import {
  salons,
  salonCategories,
  categoryLabel,
  type SalonCategory,
  type TimeWindow,
} from "@/lib/mock-data";

const timeWindows: TimeWindow[] = ["any", "morning", "afternoon", "evening"];

const previewSalons = salons.slice(0, 2);
const timeSlots = ["09:30", "10:00", "11:15", "14:00", "16:30"];

export function HeroSection() {
  const { t } = useLocale();
  const {
    category,
    setCategory,
    location,
    setLocation,
    date,
    setDate,
    window: slotWindow,
    setWindow,
    coords,
    setCoords,
    submitSearch,
  } = useSalonSearch();
  const [geoState, setGeoState] = React.useState<
    "idle" | "locating" | "denied"
  >("idle");
  const windowLabel: Record<TimeWindow, string> = {
    any: t.hero.windowAny,
    morning: t.hero.windowMorning,
    afternoon: t.hero.windowAfternoon,
    evening: t.hero.windowEvening,
  };

  function locateMe() {
    if (!navigator.geolocation) return setGeoState("denied");
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation("");
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("idle");
      },
      () => setGeoState("denied"),
      { timeout: 8000 },
    );
  }
  const sectionRef = React.useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const headingOpacity = useTransform(scrollYProgress, [0, 0.26], [1, 0]);
  const headingY = useTransform(scrollYProgress, [0, 0.4], [0, -70]);
  const searchOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  const searchY = useTransform(scrollYProgress, [0, 0.3], [0, -40]);

  const mockupScale = useTransform(scrollYProgress, [0.12, 0.62], [0.82, 1]);
  const mockupRotate = useTransform(scrollYProgress, [0.12, 0.62], [7, 0]);
  const mockupY = useTransform(scrollYProgress, [0.12, 0.62], [70, 0]);
  const mockupRadius = useTransform(scrollYProgress, [0.12, 0.62], [28, 16]);

  return (
    <section ref={sectionRef} className="relative h-[220vh] bg-background">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden border-b border-border">
        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center px-4 pt-32 sm:px-6 lg:px-8">
          <motion.div
            style={{ opacity: headingOpacity, y: headingY }}
            className="flex flex-col items-center text-center"
          >
            <span className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-3.5 fill-accent text-accent" />
              {t.hero.ratingLine}
            </span>
            <h1 className="font-heading max-w-3xl text-[2.6rem] leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              {t.hero.headlineBefore}
              <span className="text-primary">{t.hero.headlineAccent}</span>
              {t.hero.headlineAfter}
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              {t.hero.subtitle}
            </p>
          </motion.div>

          <motion.div
            style={{ opacity: searchOpacity, y: searchY }}
            className="mt-9 w-full max-w-4xl rounded-2xl border border-border bg-card p-2.5 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:border-r sm:border-border">
                <Search className="size-4 shrink-0 text-primary" />
                <Select
                  value={category ?? "all"}
                  onValueChange={(value) =>
                    setCategory(
                      !value || value === "all"
                        ? null
                        : (value as SalonCategory),
                    )
                  }
                >
                  <SelectTrigger className="h-6 w-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 [&_svg]:ml-auto">
                    <SelectValue>
                      {(value: SalonCategory | "all") =>
                        value === "all"
                          ? t.hero.searchService
                          : categoryLabel(t, value)
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
              </div>
              <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:border-r sm:border-border">
                <MapPin className="size-4 shrink-0 text-primary" />
                {coords ? (
                  <button
                    type="button"
                    onClick={() => setCoords(null)}
                    className="h-6 flex-1 truncate text-left text-sm font-medium text-primary"
                  >
                    {t.hero.searchNearby} ✕
                  </button>
                ) : (
                  <LocationAutocomplete
                    value={location}
                    onChange={setLocation}
                    onSubmit={submitSearch}
                    placeholder={t.hero.searchCity}
                    className="h-6 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                )}
                <button
                  type="button"
                  onClick={locateMe}
                  title={
                    geoState === "denied"
                      ? t.hero.searchNearbyDenied
                      : t.hero.searchNearby
                  }
                  aria-label={t.hero.searchNearby}
                  className={`shrink-0 rounded-full p-1.5 hover:bg-muted ${
                    geoState === "denied" ? "text-destructive" : "text-primary"
                  } ${geoState === "locating" ? "animate-pulse" : ""}`}
                >
                  <LocateFixed className="size-4" />
                </button>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5">
                <CalendarDays className="size-4 shrink-0 text-primary" />
                <Input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label={t.hero.searchDate}
                  className="h-6 min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
                <Select
                  value={slotWindow}
                  onValueChange={(v) => setWindow((v ?? "any") as TimeWindow)}
                >
                  <SelectTrigger className="h-6 w-auto shrink-0 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0">
                    <SelectValue>
                      {(v: TimeWindow) => windowLabel[v]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {timeWindows.map((w) => (
                      <SelectItem key={w} value={w}>
                        {windowLabel[w]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="lg"
                className="rounded-xl sm:w-auto"
                onClick={submitSearch}
              >
                {t.hero.searchSubmit}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </motion.div>
        </div>

        <div className="relative mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 pb-10 sm:px-6 lg:px-8">
          <motion.div
            style={{
              scale: mockupScale,
              rotateX: mockupRotate,
              y: mockupY,
              borderRadius: mockupRadius,
            }}
            className="relative w-full overflow-hidden border border-border bg-card p-5 shadow-lg [perspective:1200px] sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="font-heading text-lg">{t.hero.previewTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {t.hero.previewSubtitle}
                </p>
              </div>
              <span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline-flex">
                {t.hero.previewLive}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {previewSalons.map((salon) => (
                <div
                  key={salon.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <div
                    className={`size-12 shrink-0 rounded-lg bg-gradient-to-br ${salon.gradient}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{salon.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3 fill-accent text-accent" />
                      {salon.rating} · {salon.city}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                  >
                    {t.hero.previewBook}
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              {timeSlots.map((slot, i) => (
                <span
                  key={slot}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    i === 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {slot}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
