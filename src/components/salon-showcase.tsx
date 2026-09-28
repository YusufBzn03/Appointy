"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { useSalonSearch } from "@/components/search-provider";
import { SalonCard } from "@/components/salon-card";

export function SalonShowcase() {
  const { t } = useLocale();
  const { results, reset } = useSalonSearch();

  return (
    <section id="salons" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {t.showcase.eyebrow}
          </span>
          <h1 className="font-heading mt-3 max-w-md text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            {t.showcase.title}
          </h1>
        </div>

        {results.length === 0 ? (
          <div className="mt-12 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-8">
            <p className="text-muted-foreground">{t.showcase.noResults}</p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={reset}>
              {t.showcase.resetFilters}
            </Button>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((salon, index) => (
              <SalonCard key={salon.id} salon={salon} delay={(index % 3) * 0.08} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
