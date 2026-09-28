"use client";

import { motion } from "framer-motion";
import { Star, Clock, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { salons } from "@/lib/mock-data";

export function SalonShowcase() {
  return (
    <section id="salons" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Ausgewählt für dich
            </span>
            <h2 className="font-heading mt-3 max-w-md text-4xl leading-[1.1] tracking-tight sm:text-5xl">
              Salons, die Appointy-Nutzer:innen lieben.
            </h2>
          </div>
          <Button variant="outline" className="rounded-full">
            Alle Salons entdecken
            <ArrowUpRight className="size-4" />
          </Button>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {salons.map((salon, index) => (
            <motion.article
              key={salon.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: "easeOut" }}
              className="group overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative h-44 overflow-hidden">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${salon.gradient} transition-transform duration-500 ease-out group-hover:scale-110`}
                />
                <div className="grain-overlay absolute inset-0 opacity-[0.15]" />
                <span
                  aria-hidden
                  className="font-heading pointer-events-none absolute bottom-0 left-2 select-none text-[6rem] leading-[0.75] text-background/40"
                >
                  {salon.name.charAt(0)}
                </span>
                {salon.badge && (
                  <Badge className="absolute left-3 top-3 bg-background text-foreground">
                    {salon.badge}
                  </Badge>
                )}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-medium">
                  <Star className="size-3 fill-accent text-accent" />
                  {salon.rating}
                  <span className="text-muted-foreground">({salon.reviews})</span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{salon.name}</p>
                    <p className="text-sm text-muted-foreground">{salon.city}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {"€".repeat(salon.priceLevel)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    Nächster Slot: {salon.nextSlot}
                  </span>
                  <Button size="sm" variant="secondary" className="rounded-full">
                    Buchen
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
