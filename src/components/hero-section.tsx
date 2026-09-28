"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, MapPin, CalendarDays, ArrowRight, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salons } from "@/lib/mock-data";

const previewSalons = salons.slice(0, 2);
const timeSlots = ["09:30", "10:00", "11:15", "14:00", "16:30"];

export function HeroSection() {
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
              4,8 von 5 · 210.000 Buchungen im letzten Jahr
            </span>
            <h1 className="font-heading max-w-3xl text-[2.6rem] leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Dein nächster Termin, <span className="text-primary">drei Klicks</span> entfernt.
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Appointy verbindet dich mit den besten Salons, Barbers und
              Beauty-Studios in deiner Stadt — in Echtzeit buchbar, jederzeit
              stornierbar.
            </p>
          </motion.div>

          <motion.div
            style={{ opacity: searchOpacity, y: searchY }}
            className="mt-9 w-full max-w-3xl rounded-2xl border border-border bg-card p-2.5 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:border-r sm:border-border">
                <Search className="size-4 shrink-0 text-primary" />
                <Input
                  placeholder="Service — z. B. Balayage"
                  className="h-6 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:border-r sm:border-border">
                <MapPin className="size-4 shrink-0 text-primary" />
                <Input
                  placeholder="Stadt oder PLZ"
                  className="h-6 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5">
                <CalendarDays className="size-4 shrink-0 text-primary" />
                <Input
                  placeholder="Heute"
                  className="h-6 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button size="lg" className="rounded-xl sm:w-auto">
                Suchen
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
                <p className="font-heading text-lg">Verfügbar in der Nähe</p>
                <p className="text-sm text-muted-foreground">Berlin, Mitte · Heute</p>
              </div>
              <span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline-flex">
                Live-Vorschau
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
                  <Button size="sm" variant="secondary" className="rounded-full">
                    Buchen
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
