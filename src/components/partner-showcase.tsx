"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { SalonCard } from "@/components/salon-card";
import { salons, partnerStats } from "@/lib/mock-data";

const featured = salons.slice(0, 3);

export function PartnerShowcase() {
  const { t } = useLocale();

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              {t.showcase.eyebrow}
            </span>
            <h2 className="font-heading mt-3 max-w-md text-4xl leading-[1.1] tracking-tight sm:text-5xl">
              {t.showcase.title}
            </h2>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            nativeButton={false}
            render={<Link href="/salons" />}
          >
            {t.showcase.ctaButton}
            <ArrowUpRight className="size-4" />
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 border-y border-border py-5 text-sm text-muted-foreground">
          {partnerStats.map((stat) => (
            <span key={stat.key}>
              <span className="font-heading text-foreground">
                {stat.value}
                {stat.suffix}
              </span>{" "}
              {t.partners[stat.key]}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((salon, index) => (
            <SalonCard key={salon.id} salon={salon} delay={index * 0.08} />
          ))}
        </div>
      </div>
    </section>
  );
}
