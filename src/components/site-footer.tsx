"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/components/locale-provider";

export function SiteFooter() {
  const { t } = useLocale();

  const columns = [
    {
      title: t.footer.appointyHeading,
      links: [
        { label: t.footer.discoverSalons, href: "/salons" },
        { label: t.footer.forCustomers, href: "/#fuer-kunden" },
        { label: t.footer.forSalonsPartners, href: "/#fuer-salons" },
        { label: t.footer.pricing, href: "#" },
      ],
    },
    {
      title: t.footer.companyHeading,
      links: [
        { label: t.footer.about, href: "#" },
        { label: t.footer.careers, href: "#" },
        { label: t.footer.press, href: "#" },
        { label: t.footer.blog, href: "#" },
      ],
    },
    {
      title: t.footer.legalHeading,
      links: [
        { label: t.footer.impressum, href: "#" },
        { label: t.footer.privacy, href: "#" },
        { label: t.footer.terms, href: "#" },
        { label: t.footer.cookies, href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              <span className="font-heading text-lg tracking-tight">Appointy</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{t.footer.description}</p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-heading text-sm">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Appointy GmbH. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
