import Link from "next/link";
import { Sparkles, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const columns = [
  {
    title: "Appointy",
    links: [
      { label: "Salons entdecken", href: "#salons" },
      { label: "Für Kund:innen", href: "#fuer-kunden" },
      { label: "Für Salons & Partner", href: "#fuer-salons" },
      { label: "Preise für Salons", href: "#" },
    ],
  },
  {
    title: "Unternehmen",
    links: [
      { label: "Über uns", href: "#" },
      { label: "Karriere", href: "#" },
      { label: "Presse", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Rechtliches",
    links: [
      { label: "Impressum", href: "#" },
      { label: "Datenschutz", href: "#" },
      { label: "AGB", href: "#" },
      { label: "Cookie-Einstellungen", href: "#" },
    ],
  },
];

const languages = ["Deutsch (DE)", "English (EN)", "Français (FR)", "Italiano (IT)"];

export function SiteFooter() {
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
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Die Buchungsplattform für Salons, Barbers und Beauty-Profis —
              gebaut für Kund:innen, die es unkompliziert wollen, und Salons,
              die es professionell wollen.
            </p>

            <label className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm text-muted-foreground">
              <Globe className="size-3.5" />
              <select
                defaultValue={languages[0]}
                className="bg-transparent text-foreground outline-none"
              >
                {languages.map((lang) => (
                  <option key={lang}>{lang}</option>
                ))}
              </select>
            </label>
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
            © {new Date().getFullYear()} Appointy GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
