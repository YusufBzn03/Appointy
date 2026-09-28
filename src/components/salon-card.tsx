"use client";

import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { treatmentLabel, type Salon } from "@/lib/mock-data";

export function SalonCard({ salon, delay = 0 }: { salon: Salon; delay?: number }) {
  const { t } = useLocale();

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
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
            <p className="text-sm text-muted-foreground">
              {salon.city} · {treatmentLabel(t, salon.treatments[0])}
            </p>
          </div>
          <span className="text-sm text-muted-foreground">{"€".repeat(salon.priceLevel)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {t.showcase.nextSlot}: {salon.nextSlot}
          </span>
          <Button size="sm" variant="secondary" className="rounded-full">
            {t.showcase.bookButton}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
