"use client";

import { motion } from "framer-motion";
import { CalendarClock, BellRing, LineChart, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import { partnerStats, partnerFeatures } from "@/lib/mock-data";

const featureIcons = [CalendarClock, BellRing, LineChart];

const weekBars = [38, 52, 44, 68, 84, 96, 61];

export function PartnersSection() {
  return (
    <section id="fuer-salons" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="dark relative overflow-hidden rounded-[2.25rem] bg-background text-foreground ring-1 ring-foreground/10">
          <div className="relative grid gap-14 p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Für Salons &amp; Partner
              </span>
              <h2 className="font-heading mt-3 max-w-md text-4xl leading-[1.1] tracking-tight sm:text-5xl">
                Dein Salon, digital im Griff.
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Kalender, Erinnerungen und Umsatzanalyse an einem Ort —
                Appointy übernimmt die Verwaltung, du übernimmst den Stuhl.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-6">
                {partnerStats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-heading text-3xl tracking-tight sm:text-4xl">
                      <AnimatedCounter
                        value={stat.value}
                        suffix={stat.suffix}
                        decimals={stat.value % 1 !== 0 ? 1 : 0}
                      />
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <Button className="mt-10 rounded-full" size="lg">
                Partner werden
                <ArrowUpRight className="size-4" />
              </Button>
            </div>

            <div>
              <div className="rounded-2xl border border-border/60 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Auslastung diese Woche
                  </p>
                  <span className="text-sm font-medium text-primary">+18%</span>
                </div>
                <div className="mt-5 flex h-28 items-end gap-2.5">
                  {weekBars.map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                      className="flex-1 rounded-t-sm bg-primary"
                    />
                  ))}
                </div>
              </div>

              <ul className="mt-6 divide-y divide-border/60 border-t border-border/60">
                {partnerFeatures.map((feature, i) => {
                  const Icon = featureIcons[i];
                  return (
                    <li key={feature.title} className="flex items-start gap-4 py-4">
                      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">{feature.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
