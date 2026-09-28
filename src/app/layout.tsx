import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Appointy — Termine für Salons, Barbers & Beauty",
  description:
    "Appointy verbindet Kund:innen mit den besten Salons, Barbers und Beauty-Profis in ihrer Stadt. In wenigen Klicks buchen, in Minuten managen.",
  openGraph: {
    title: "Appointy — Termine für Salons, Barbers & Beauty",
    description:
      "In wenigen Klicks den passenden Termin finden. Für Salons: Kalender, Erinnerungen und Umsatz-Insights an einem Ort.",
    type: "website",
    locale: "de_DE",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
