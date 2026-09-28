"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { categories } from "@/lib/mock-data";

export function SiteHeader() {
  const { scrollY } = useScroll();
  const categoryOpacity = useTransform(scrollY, [0, 140], [1, 0]);
  const categoryHeight = useTransform(scrollY, [0, 140], [44, 0]);

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
              <Input
                placeholder="Service, z. B. Balayage oder Bartschnitt"
                className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              <span className="h-4 w-px shrink-0 bg-border" />
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Stadt oder PLZ"
                className="h-7 w-32 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Anmelden
            </Button>
            <Button size="sm" className="rounded-full">
              Salon werden
            </Button>
          </div>
        </div>

        <motion.div
          style={{ opacity: categoryOpacity, height: categoryHeight }}
          className="hidden overflow-hidden md:block"
        >
          <nav className="mx-auto flex max-w-7xl items-center gap-1 px-4 pb-2.5 sm:px-6 lg:px-8">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`#${category.slug}`}
                className="group flex items-center gap-1.5 rounded-full px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <category.icon className="size-3.5" />
                {category.label}
              </Link>
            ))}
          </nav>
        </motion.div>
      </div>
    </header>
  );
}
