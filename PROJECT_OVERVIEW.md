# Appointy – Projektübersicht

Stand: 2026-10-17 (Branch `main`, letzter Commit `8d56118`). Dieses Dokument beschreibt den Ist-Zustand des Repos für eine KI, die den Code nicht sehen kann. Pfade sind relativ zum Repo-Root. Aus den Dateien belegt ist nur, was hier mit einem Pfad genannt wird; Aussagen ohne Pfad sind Einordnungen.

## 1. Zweck der App

Appointy ist eine Buchungsplattform für Beauty & Care (Barber, Friseur, Kosmetik, Nagelstudio, Spa). Das Prinzip ähnelt Planity: Kunden suchen Salons und buchen Termine, Salons verwalten Team, Kalender und Benachrichtigungen. Die Optik ist bewusst eigenständig und nicht generisch (siehe `.claude/skills/anti-ai-slop/`).

### Nutzergruppen

| Rolle | DB-Wert | Kann |
|---|---|---|
| Kunde | `customer` (Default bei Registrierung) | Salons suchen, einloggen, Termin buchen |
| Salon-Inhaber | `salon_owner` | Onboarding-Wizard, eigenes Dashboard, Behandlungen und Benachrichtigungskanäle verwalten |
| Super-Admin | `admin` | Plattform-Statistik, Salons freigeben oder sperren. Wird nur per Service-Role oder SQL vergeben, nie über die Registrierung |

### Status der Funktionen

**Fertig (Frontend und Backend verdrahtet, sobald Supabase-Env gesetzt ist):**
- Landingpage mit Hero, Salon-Teaser, Kunden-Demo und Partner-Sektion (`src/app/page.tsx`).
- Suche nach Kategorie, Ort/PLZ (20-km-Radius), Datum, Tageszeitfenster und Geolocation; Ergebnisliste unter `/salons`.
- Buchungsdialog in 5 Schritten: Behandlung, Mitarbeiter, Zeit, Bestätigung, Fertig (`src/components/booking-dialog.tsx`). Die Slots werden clientseitig aus Öffnungszeiten und `busy_slots()` berechnet.
- Doppelbuchungsschutz in der Datenbank (GiST-Exclusion-Constraint `appointments_no_overlap`).
- Auth mit E-Mail und Passwort, Rollen über `public.profiles` (`src/components/auth-provider.tsx`).
- Onboarding-Wizard schreibt atomar über die RPC `onboard_salon()`; neue Salons haben Status `pending`.
- Salon-Dashboard (live): Kennzahlen, Team, 7-Tage-Verfügbarkeit, Behandlungen an/aus, Kanäle an/aus, Benachrichtigungslog.
- Admin-Dashboard (live): Plattformzahlen, Kosten pro Kanal, Salon-Audit mit Freigeben/Sperren.
- Benachrichtigungs-Pipeline: DB-Trigger → Queue-Tabelle → Dispatcher (Next-Route und Edge Function) → Expo Push, Twilio SMS, Resend E-Mail inklusive `.ics`-Anhang.
- 7 Sprachen inklusive RTL, Dark/Light-Mode.

**Halb fertig / nur simuliert:**
- Ohne Supabase-Env läuft die gesamte App auf Mock-Daten (`src/lib/mock-data.ts`). Das ist beabsichtigt (`src/lib/supabase/client.ts` liefert dann `null`).
- Onboarding-Pfad "automatisch" (Website-URL → Daten holen) ist ein `setTimeout` mit erfundenen Daten (`src/components/onboarding-wizard.tsx`, `runAutoFetch`).
- Kalender-Anbindung (Google, Outlook, E-Mail) ist nur ein UI-Toggle im Wizard. Die Tabellen `staff_calendars` und `calendar_secrets` existieren, aber keine OAuth- oder Sync-Logik.
- Push-Registrierung im Dashboard: `pushRegistered` ist lokaler State (`src/components/salon-dashboard.tsx:73`). Es gibt keine Expo-App und keinen Code, der `push_tokens` befüllt.
- Das Onboarding speichert keine Preise und keine Dauer (Default 30 min, `price_cents` null) und keine benutzerdefinierten Behandlungen. Die Öffnungszeiten sind für alle Tage gleich.
- Eine Kategorie wird nicht abgefragt, sondern aus den Behandlungen abgeleitet (`inferCategory` in `src/lib/supabase/onboarding.ts`).
- Bewertungen, Sterne und Preislevel sind denormalisierte Felder in `salons` (Migration 0002), keine Reviews-Tabelle.
- Die gesamte Supabase-Seite (Migrations, pgTAP, Edge Function) wurde laut `supabase/README.md` noch nicht Ende-zu-Ende ausgeführt.

**Geplant / fehlt:**
- Kundenbereich ("Meine Termine", Stornieren per UI). Die DB erlaubt Kunden nur das Stornieren.
- Foto-Upload für Salons (Bucket `salon-photos` und Spalte `photo_paths` existieren, es gibt keine UI; Karten nutzen Duoton-Verläufe).
- Abo-/Billing-Daten (MRR im Admin-Dashboard zeigt live "—").
- Echte Rechts- und Unternehmensseiten (Footer-Links `#`).
- Passwort-Reset, Social Login, Routenschutz per Middleware.

## 2. Tech-Stack

| Bereich | Technologie (Version laut `package.json`) |
|---|---|
| Framework | Next.js 16.3.6 (App Router, Turbopack), React 19.2.8, TypeScript 5 |
| Styling | Tailwind CSS 4 (CSS-first, **keine** `tailwind.config.*`), `tw-animate-css` 1.4, `@tailwindcss/postcss` |
| UI-Komponenten | shadcn/ui 4.21 (Style `base-nova`), Basis `@base-ui/react` 1.8 (nicht Radix), `class-variance-authority`, `clsx`, `tailwind-merge`; `cn` kommt aus dem npm-Paket `cn` (`src/lib/utils.ts`) |
| Motion | `framer-motion` 13.4 |
| Theme | `next-themes` 0.4 (Klassenstrategie) |
| Icons | `lucide-react` 1.48 |
| Backend | Supabase (Postgres 15, Auth, Storage, Edge Functions), Client `@supabase/supabase-js` 2.117 |
| SMS | Twilio REST API |
| E-Mail | Resend REST API |
| Push | Expo Push API (`exp.host`) |
| Hosting | Vercel (nur `vercel.json` mit einem Cron belegt, kein Deployment-Nachweis im Repo) |
| Lint | ESLint 9 mit `eslint-config-next` (core-web-vitals und typescript); `supabase/**` ist ignoriert |

Weitere Fakten:
- `next.config.ts` setzt nur `turbopack.root`.
- Es gibt keine Testframeworks im Node-Teil. Datenbanktests laufen als pgTAP (siehe Abschnitt 13).
- Kein Supabase-CLI-Paket in den Dependencies (`supabase/README.md` empfiehlt `npm i -D supabase`).
- Das Pfad-Alias `@/*` zeigt auf `src/*` (`tsconfig.json`).
- AI-/LLM-Aufrufe gibt es in der App nicht.

**Next.js 16 weicht von älteren Versionen ab.** `AGENTS.md` verlangt, vor dem Schreiben von Code die Doku in `node_modules/next/dist/docs/` zu lesen. `RootLayout` nutzt den Helper-Typ `LayoutProps<"/">`.

## 3. Ordnerstruktur

```
/
├─ AGENTS.md, CLAUDE.md          Anweisungen für KI-Agenten (CLAUDE.md importiert AGENTS.md; CLAUDE.md enthält die ausführliche Architekturdoku)
├─ PROJECT_OVERVIEW.md           dieses Dokument
├─ README.md                     Next.js-Standardtext (veraltet, siehe Abschnitt 14)
├─ components.json               shadcn-Konfiguration (base-nova, Lucide, Aliase)
├─ eslint.config.mjs, tsconfig.json, postcss.config.mjs, next.config.ts
├─ vercel.json                   Cron: GET /api/notifications/dispatch stündlich
├─ .env.example                  Env-Vorlage (nur Platzhalter)
├─ public/                       nur Next-Standard-SVGs
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              Root-Layout: Fonts, Provider-Kette, BackToTop, Metadata
│  │  ├─ globals.css             Design-Tokens, Tailwind-Theme, Utilities
│  │  ├─ page.tsx                Landingpage "/"
│  │  ├─ salons/page.tsx         Suchergebnisse (Suspense + Client-Komponente)
│  │  ├─ onboarding/page.tsx     Salon-Wizard
│  │  ├─ dashboard/page.tsx      Salon-Dashboard
│  │  ├─ admin/page.tsx          Admin-Dashboard
│  │  └─ api/notifications/dispatch/route.ts   Dispatcher-Endpoint (GET und POST)
│  ├─ components/
│  │  ├─ ui/                     shadcn-Primitives (avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label, progress, select, separator, switch, table, tabs, textarea)
│  │  ├─ *-provider.tsx          Context-Provider (theme, locale, auth, salon-data, search)
│  │  ├─ site-header.tsx, site-footer.tsx, hero-section.tsx, partner-showcase.tsx, customers-section.tsx, partners-section.tsx
│  │  ├─ salon-card.tsx, salon-showcase.tsx, salons-page-client.tsx, booking-dialog.tsx
│  │  ├─ auth-modal.tsx, onboarding-wizard.tsx, salon-dashboard.tsx, admin-dashboard.tsx
│  │  └─ language-switcher.tsx, theme-toggle.tsx, back-to-top.tsx, animated-counter.tsx, location-autocomplete.tsx, search-transition-overlay.tsx
│  └─ lib/
│     ├─ mock-data.ts            Typen (Salon, TreatmentId, SalonCategory …), Mock-Daten, filterSalons()
│     ├─ geo.ts                  handgepflegte PLZ-Liste (9 Orte), Haversine, Autocomplete-Helfer
│     ├─ format.ts               intlLocale(), formatRelativeDateTime()
│     ├─ utils.ts                re-exportiert cn
│     ├─ i18n/                   index.ts, locales.ts, types.ts (Dictionary), dictionaries/{de,en,tr,ar,fr,sr,ru}.ts
│     ├─ supabase/               client.ts, salons.ts, booking.ts, onboarding.ts, dashboard.ts, admin.ts
│     └─ notifications/dispatch.ts   serverseitiger Dispatcher (Next-Port der Edge Function)
├─ supabase/
│  ├─ config.toml                lokales Projekt "appointy": API 54321, DB 54322, Postgres 15, E-Mail-Bestätigung aus
│  ├─ README.md                  Anleitung: Migrations testen, Edge Function deployen, Webhook und Cron verdrahten
│  ├─ migrations/0001_init.sql   Schema, Enums, RLS, Trigger, Storage
│  ├─ migrations/0002_dispatch_queue.sql   Queue-Claiming, Salon-Anzeigefelder
│  ├─ migrations/0003_onboarding_and_slots.sql   onboard_salon(), next_free_slots()
│  ├─ migrations/0004_payload_labels_and_dashboards.sql   deutsche Labels, Dashboard-/Admin-RPCs
│  ├─ functions/dispatch-notifications/index.ts   Deno-Edge-Function (gleiche Logik wie die Next-Route)
│  └─ tests/database/rls.test.sql   pgTAP, 18 Assertions
└─ .claude/skills/               Skills (siehe Abschnitt 12)
```

## 4. Seiten und Routen

Alle Seiten sind dünne Server-Wrapper um Client-Komponenten.

| Pfad | Datei | Zweck | Genutzte Komponenten |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Landingpage | `SearchProvider` › `SiteHeader`, `HeroSection`, `PartnerShowcase`, `CustomersSection`, `PartnersSection`, `SiteFooter`. Anker `#fuer-kunden` und `#fuer-salons` |
| `/salons` | `src/app/salons/page.tsx` | Suchergebnisse, liest `category`, `location`, `near`, `date`, `window` aus der URL (`useSearchParams`, deshalb `<Suspense>`) | `SalonsPageClient` › eigener `SearchProvider`, `SiteHeader`, `SalonShowcase` › `SalonCard` › `BookingDialog`, `SiteFooter` |
| `/onboarding` | `src/app/onboarding/page.tsx` | 6-Schritt-Wizard für Salons | `OnboardingWizard` (eigener Header, `Progress`, `LanguageSwitcher`, `ThemeToggle`) |
| `/dashboard` | `src/app/dashboard/page.tsx` | Salon-Dashboard mit Tabs Overview, Calendar, Staff, Treatments, SMS-Hub | `SalonDashboard` › `LiveDashboardView` oder `MockDashboard` › `DashboardView` |
| `/admin` | `src/app/admin/page.tsx` | Admin-Dashboard | `AdminDashboard` › `LiveAdmin` oder `MockAdmin` › `AdminView` |
| `GET, POST /api/notifications/dispatch` | `src/app/api/notifications/dispatch/route.ts` | Liefert wartende Zeilen aus `notification_log` aus (max. 25 pro Lauf, `maxDuration = 30`, Node-Runtime) | `dispatchPendingNotifications()` aus `src/lib/notifications/dispatch.ts` |
| `POST …/functions/v1/dispatch-notifications` | `supabase/functions/dispatch-notifications/index.ts` | Gleiche Aufgabe als Supabase Edge Function, `verify_jwt = false` | – |

Autorisierung des API-Endpunkts: Header `x-dispatch-secret` = `DISPATCH_SECRET`, oder `Authorization: Bearer <CRON_SECRET>`, oder ein gültiges Supabase-User-Access-Token. Die Edge Function akzeptiert nur `x-dispatch-secret`.

Es gibt keine Middleware und keine serverseitigen Routenschutzmechanismen. Die Rollenprüfung für `/dashboard`, `/admin` und `/onboarding` passiert im Client.

## 5. Komponenten

Provider-Kette in `src/app/layout.tsx`: `ThemeProvider` › `LocaleProvider` › `AuthProvider` › `SalonDataProvider` › Seiteninhalt + `BackToTop`. `SearchProvider` wird pro Seite (`/`, `/salons`) geöffnet, nicht global.

| Komponente (Datei) | Aufgabe | Props / Hook-Rückgabe |
|---|---|---|
| `LocaleProvider`, `useLocale()` (`locale-provider.tsx`) | Sprache, Wörterbuch `t`, Richtung | `useLocale()` → `{ locale, setLocale, t, dir }`. Speicherung in `localStorage["appointy-locale"]` |
| `AuthProvider`, `useAuth()` (`auth-provider.tsx`) | Session und Rolle | → `{ available, loading, session, role, signIn(email,pw)→string\|null, signUp({email,password,fullName?,role,locale})→{error,needsConfirmation}, signOut() }` |
| `SalonDataProvider`, `useSalonData()` (`salon-data-provider.tsx`) | Salon-Quelle: Supabase oder Mock-Fallback; pollt `next_free_slots` alle 60 s | → `{ salons, source: "supabase"\|"mock", loading, availableTreatmentIds, refreshSlots() }` |
| `SearchProvider`, `useSalonSearch()` (`search-provider.tsx`) | Gemeinsamer Suchstate für Hero und Header | Props: `initialCategory?`, `initialLocation?`, `initialDate?`, `initialWindow?`, `initialCoords?`. Hook → `{ category, location, date, window, coords, setters…, results, isFiltered, reset(), submitSearch() }`. `submitSearch` zeigt 650 ms den Overlay und ruft dann `router.push("/salons?…")` |
| `SiteHeader` | Fixierter Header: Logo, kompakte Suche (Select und `LocationAutocomplete`), Behandlungs-Shortcut-Zeile (horizontal scrollbar, klappt beim Scrollen ein), `LanguageSwitcher`, `ThemeToggle`, Login oder Logout | keine Props |
| `HeroSection` | Scroll-gesteuerte Sequenz (`h-[220vh]`, innen `sticky`), große Suche, "In deiner Nähe" (Geolocation) | keine Props |
| `PartnerShowcase` | Teaser mit den ersten 3 Salons und `partnerStats` | keine Props |
| `CustomersSection` | 3-Schritt-Buchungsdemo (`AnimatePresence`) | keine Props |
| `PartnersSection` | B2B-Sektion, erzwungen dunkel über `.dark`-Wrapper | keine Props |
| `SalonShowcase` | Ergebnisraster mit Leerzustand und "Filter zurücksetzen" | keine Props |
| `SalonCard` (`salon-card.tsx`) | Karte mit Verlauf und Monogramm, Badge, Bewertung, "Nächster Termin", Buchen-Button | `{ salon: Salon; delay?: number }` |
| `BookingDialog` | Buchungsablauf, schreibt über `createAppointment()` | `{ salon: Salon; live: boolean; open: boolean; onOpenChange(open) }`. Ohne Login zeigt er `t.booking.signInFirst`. Bei `live=false` (Mock) gibt es keine buchbaren Daten |
| `AuthModal` | Dialog mit Tabs Kunde und Salon; der Salon-Tab leitet zu `/onboarding` | `{ open; onOpenChange; defaultTab?: "customer"\|"salon" }` |
| `OnboardingWizard` | Wizard: Pfad › Business › Behandlungen › SMS-Vorschau › Kalender/Team › Review; Submit ruft `submitOnboarding()` | keine Props |
| `SalonDashboard` | Wählt `LiveDashboardView` (Supabase konfiguriert) oder `MockDashboard`. `DashboardView` erhält `ViewProps` mit `salonLine, notice?, stats, staff, log, offered, onToggleTreatment, channels, onChannelChange` | keine Props |
| `AdminDashboard` | Wählt `LiveAdmin` oder `MockAdmin`; `AdminView` mit Kacheln, Kostenaufteilung und Salon-Tabelle | keine Props |
| `LocationAutocomplete` | PLZ- und Ort-Vorschläge. Hält bewusst zwei States: angezeigter Text (Stadtname) und übergebener Wert (PLZ). Nicht zusammenlegen | `{ value; onChange(v); placeholder; className?; onSubmit? }` |
| `LanguageSwitcher`, `ThemeToggle`, `BackToTop` (erscheint bei `scrollY > 640`), `AnimatedCounter` (`{ value; suffix?; decimals? }`), `SearchTransitionOverlay` (`{ show: boolean }`), `SiteFooter` | Hilfskomponenten | |

Wichtige Lib-Module (Props-ähnliche Verträge):
- `src/lib/supabase/booking.ts`: `fetchBookingData(salonId)`, `fetchBusySlots()`, `computeSlots()` (30-Minuten-Raster, 30 min Vorlauf), `createAppointment()`. Fehlercode `23P01` wird zu `reason: "taken"`. Nach dem Insert ruft die Funktion `triggerDispatch()` auf (Fire-and-forget `POST /api/notifications/dispatch` mit User-Token).
- `src/lib/supabase/salons.ts`: `fetchSalons()`, `fetchNextSlots()`, `fetchAvailableTreatmentIds()`.
- `src/lib/supabase/dashboard.ts`: `fetchOwnerSalon()`, `fetchDashboard()`, `setTreatmentOffered()`, `saveChannels()`.
- `src/lib/supabase/admin.ts`: `fetchPlatformStats()`, `fetchAdminSalons()`, `setSalonStatus()`.
- `src/lib/supabase/onboarding.ts`: `parseAddress()`, `inferCategory()`, `submitOnboarding()`.

Daten-Fallback-Regel: Jede Supabase-Funktion wirft bei fehlendem Client. Aufrufer prüfen `supabase !== null` bzw. `useAuth().available` und fallen auf Mock-Daten zurück.

## 6. Design-System

### Stimmung

Warm und ruhig, kein Tech-Look. Sand/Creme im Light-Mode, tiefes Obsidian-Blau-Schwarz im Dark-Mode. Akzente sind Smaragdgrün (Primär) und Champagner/Gold. Editoriales Verzeichnis-Gefühl: große Serif-Überschriften (Fraunces) mit kleinen Versal-Eyebrows in Grün, großzügige Rundungen (Apple-artig), viel Weißraum, flache Karten mit Haarlinien-Rändern. Salons ohne Foto erhalten einen Duoton-Verlauf und einen großen Serif-Anfangsbuchstaben (bewusstes Stilmittel). Auf den Fototiles liegt ein dezentes SVG-Rauschen (`.grain-overlay`).

Bewusst vermieden (laut `CLAUDE.md`): Gradient-Text, flächendeckendes Glassmorphism, generische SaaS-Optik. `.glass` wird nur für den fixierten Header genutzt.

### Farben

Quelle: OKLCH-Variablen in `src/app/globals.css` (`:root` und `.dark`), über `@theme inline` auf die semantischen Tailwind-Klassen gemappt. Im Code immer semantische Klassen nutzen (`bg-background`, `text-muted-foreground`, `bg-primary` …), nie Hex. Die Hex-Werte unten sind nach sRGB umgerechnet (gerundet) und nur zur Orientierung.

| Token | Light | Dark |
|---|---|---|
| background | `#faf6ef` | `#080d13` |
| foreground | `#0b1015` | `#f5f1e9` |
| card / popover | `#fefbf6` | `#10151d` |
| primary (Smaragd) | `#005133` | `#24c187` |
| primary-foreground | `#fcf8f0` | `#03080f` |
| secondary | `#ede7db` | `#1a2028` |
| muted | `#f1ece2` | `#1a2028` |
| muted-foreground | `#605a4d` | `#9e988b` |
| accent (Champagner) | `#d8ba79` | `#cfb47c` |
| accent-foreground | `#241807` | `#170d02` |
| destructive | `#d01c29` | `#ff6367` |
| border / input | `#e0dace` | Weiß 10 % / 14 % Alpha |
| ring | `#3f936e` | `#24c187` |
| chart-1 … 5 | `#005133`, `#d8ba79`, `#2e835f`, `#a38c5d`, `#182e4b` | `#24c187`, `#cfb47c`, `#03875b`, `#917e56`, `#506580` |

Sidebar-Tokens (`--sidebar*`) existieren als shadcn-Standard, werden aber nicht genutzt.

Fest eincodierte Hex-Werte gibt es nur in den Salon-Verläufen: `gradient` in `src/lib/mock-data.ts` und das Array `gradients` in `src/lib/supabase/salons.ts` (Tailwind `from-[#…] via-[#…] to-[#…]`).

### Schriften

Beide über `next/font/google` in `src/app/layout.tsx`:
- **Fraunces** (`--font-fraunces`, Achsen `opsz`, `SOFT`, `WONK`): Überschriften, Klasse `font-heading`.
- **Inter** (`--font-inter`): Fließtext und UI (`font-sans`; `font-mono` ist ebenfalls Inter).

Typische Muster: Eyebrow `text-xs font-medium uppercase tracking-[0.18em] text-primary`; H1/H2 `font-heading text-4xl sm:text-5xl leading-[1.1] tracking-tight`.

### Radius, Abstände, Schatten

- `--radius: 1.1rem`. Abgeleitet: sm = 0.55×, md = 0.75×, lg = 1×, xl = 1.4×, 2xl = 1.9×, 3xl = 2.4×, 4xl = 3× (alles in `globals.css`). Karten nutzen `rounded-2xl`, Buttons und Eingabe-Pills `rounded-full`, große Panels bis `rounded-[2.25rem]`.
- Abstände: Tailwind-Standardskala, keine eigenen Tokens. Container `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`; Sektionen `py-16 sm:py-20` bis `py-24 sm:py-32`.
- Schatten: keine eigenen Tokens, nur Tailwind-Standard (`shadow-sm`, `shadow-md`, `shadow-lg`). Karten setzen vor allem auf 1-px-Ränder statt Schatten.

### Dark Mode

`next-themes` mit `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange` (`src/components/theme-provider.tsx`, `layout.tsx`). Tailwind-Variante: `@custom-variant dark (&:is(.dark *))`. Einzelne Sektionen erzwingen Dunkel mit einem `.dark`-Wrapper (`src/components/partners-section.tsx`), statt Farben zu duplizieren.

### Animation

- Hero (`hero-section.tsx`): einzige scroll-gescrubbte Sequenz. `useScroll({ target, offset: ["start start","end end"] })` über 220vh; Headline und Suche blenden früh aus (Fortschritt 0–0.3), das Mockup skaliert, entdreht und verengt den Radius (0.12–0.62). Neue Transforms gehören auf dieselbe `scrollYProgress`-Timeline.
- Header-Kategorienzeile kollabiert über `useTransform(scrollY, [0,140], …)`, nicht über React-State.
- Alles andere: einmalige `whileInView`-Einblendungen (Salon-Karten gestaffelt) oder `AnimatePresence` für diskrete Wechsel (Buchungsdemo, Overlay, BackToTop).
- `prefers-reduced-motion` ist global in `globals.css` abgefangen.
- Das Suchübergangs-Overlay (650 ms) ist reine Optik, die Navigation selbst wäre sofort.

### Konfiguration

Es gibt keine Tailwind-Konfigdatei. Alles liegt in `src/app/globals.css`: `@import "tailwindcss"`, `tw-animate-css`, `shadcn/tailwind.css`, `@theme inline`, Tokens, `@layer base` und `@layer utilities` (`.font-heading`, `.glass`, `.grain-overlay`). `components.json`: `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`, `rtl: false`.

Base-UI-Besonderheiten:
- `SelectValue` braucht eine Render-Funktion als Kind, sonst zeigt der Trigger den Rohwert (z. B. `"all"`). Muster in `hero-section.tsx` und `site-header.tsx`.
- `Button` mit `render={<Link … />}` braucht zusätzlich `nativeButton={false}` (Beispiel `partner-showcase.tsx`).

## 7. Mehrsprachigkeit

- Sprachen (`src/lib/i18n/locales.ts`): `de` (Standard), `en`, `tr`, `ar` (RTL), `fr`, `sr` (lateinische Schrift), `ru`.
- `src/lib/i18n/types.ts` definiert das Interface `Dictionary` und ist die Quelle der Wahrheit für alle Schlüssel. Top-Level-Gruppen: `common`, `nav`, `hero`, `categories`, `treatments`, `customers`, `partners`, `showcase`, `footer`, `auth`, `onboarding`, `dashboard`, `admin`, `notify`, `booking`, `live`.
- Jede Datei `src/lib/i18n/dictionaries/<code>.ts` ist als `: Dictionary` typisiert. Fehlt ein Schlüssel, scheitert der TypeScript-Build. Den Typ nicht lockern.
- `src/lib/i18n/index.ts` exportiert `dictionaries`, `locales`, `defaultLocale`, `getLocaleMeta`.
- Zugriff in Komponenten: `const { t, locale } = useLocale()` und dann `t.gruppe.schluessel`. Treatment- und Kategorie-Labels über `treatmentLabel(t, id)` und `categoryLabel(t, cat)` (`src/lib/mock-data.ts`).
- Die Sprache ist eine reine Client-Einstellung ohne URL-Präfix. `localStorage["appointy-locale"]`, gelesen über `useSyncExternalStore`, vermeidet Hydration-Flackern. `setLocale` setzt `document.documentElement.lang` und `dir`. RTL wird durch natives CSS umgesetzt, es gibt keine manuellen RTL-Klassen.
- Server-HTML ist immer `lang="de"` (`layout.tsx`). Die Metadata ist nur deutsch.
- `intlLocale()` (`src/lib/format.ts`) mappt `sr` auf `sr-Latn` für `Intl`-APIs.
- Bewusst nicht übersetzt:
  - Der Benachrichtigungs-Payload ist fixes deutsches Geschäftsformat: `Neuer Termin! DD.MM.YYYY HH:MM Uhr | <Behandlung> | Kunde: <Name> | Tel: <Telefon>`. Er wird in der DB erzeugt (`format_booking_payload`, Migration 0004) und die Behandlungsnamen stammen aus `treatments.label_de`. Die Spalte `label_de` muss manuell mit `dictionaries/de.ts` synchron gehalten werden. Buchstabenfolgen in RTL-Kontext brauchen `dir="ltr"` (Vorschau im Wizard).
  - Mock-Inhalte wie Salon-, Mitarbeiter- und Städtenamen, relative Zeitstrings in Mock-Daten und die `industry`-Labels im Mock-Admin.

Neue Sprache hinzufügen: `LocaleCode` in `types.ts` ergänzen, Wörterbuchdatei anlegen, Eintrag in `locales.ts` und in `dictionaries` (`index.ts`). Der Check-Constraint `profiles.locale` in `0001_init.sql` listet die erlaubten Codes und müsste per neuer Migration erweitert werden.

## 8. Datenbank (Supabase / Postgres)

Alle Tabellen haben RLS aktiviert. Erweiterungen: `btree_gist`, `pgcrypto`.

### Enums
`user_role` (customer, salon_owner, admin), `salon_category` (barber, friseur, kosmetik, nagelstudio, spa), `salon_status` (pending, active, suspended), `appointment_status` (confirmed, cancelled, completed, no_show), `notify_channel` (push, sms, email), `notify_status` (pending, processing, sent, failed, skipped; `processing` kam in 0002 dazu), `calendar_provider` (google, outlook, email).

### Tabellen

| Tabelle | Wichtige Spalten | Beziehungen |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `role`, `full_name`, `phone`, `locale` (Check auf 7 Codes) | 1:1 zu `auth.users`, on delete cascade |
| `treatments` | `id` (Text, z. B. `haircut`), `core`, `sort`, `label_de` | Katalog mit 11 Einträgen (4 Kern, 7 optional) |
| `salons` | `owner_id`, `name`, `slug` (unique), `category`, `street`, `postal_code`, `city`, `lat`, `lng`, `phone`, `phone_verified_at`, `website`, `photo_paths text[]`, `status` (Default `pending`), `rating`, `review_count`, `price_level`, `badge` | `owner_id` → `profiles` (restrict) |
| `salon_treatments` | PK (`salon_id`, `treatment_id`), `duration_min` (5–480, Default 30), `price_cents` | → `salons`, `treatments` |
| `opening_hours` | `salon_id`, `weekday` (0 = Sonntag), `opens_at`, `closes_at` | → `salons` |
| `staff` | `salon_id`, `name`, `active` | → `salons` |
| `staff_treatments` | PK (`staff_id`, `treatment_id`), `salon_id` | FK auf `staff` und auf `salon_treatments` (zusammengesetzt) |
| `staff_calendars` | `staff_id`, `salon_id`, `provider`, `external_id`, `account_email`, `sync_token`, `last_synced_at` | → `staff`, `salons` |
| `calendar_secrets` | `calendar_id`, `secret_enc bytea` | nur Service-Role (RLS ohne Policy) |
| `appointments` | `salon_id`, `staff_id`, `treatment_id`, `customer_id` (null erlaubt, set null bei Löschung), `customer_name/phone/email` (Snapshot), `starts_at`, `ends_at`, `status`, `notes` | Exclusion-Constraint `appointments_no_overlap` (pro `staff_id`, nur `status = 'confirmed'`) |
| `notification_settings` | PK `salon_id`, `push_enabled`, `sms_enabled`, `email_enabled`, `sms_phone`, `notify_email` | → `salons` |
| `push_tokens` | `user_id`, `token` (unique), `platform` (ios, android, web) | → `profiles` |
| `notification_log` | `salon_id`, `appointment_id`, `channel`, `recipient`, `payload`, `status`, `attempts`, `provider_id`, `error`, `cost_micro_eur` (1 000 000 = 1 €), `sent_at` | → `salons`, `appointments` (set null) |

Storage: öffentlicher Bucket `salon-photos`. Lesen für alle, Schreiben/Ändern/Löschen nur für Besitzer im Ordner `<salon_id>/`.

### Funktionen und Trigger

- `handle_new_user` (Trigger auf `auth.users`): legt das Profil an. Aus den Metadaten wird nur `salon_owner` übernommen, sonst `customer`.
- `profiles_guard_role`: Rolle ändern nur mit Service-Role.
- `salons_guard`: Insert erzwingt `pending` (außer Admin); `status` und `owner_id` ändern nur Admin oder Service-Role.
- `appointments_guard`: Kunden dürfen nur auf `cancelled` setzen.
- `queue_booking_notifications` (Trigger `appointments_notify` nach Insert): legt `notification_log`-Zeilen an (siehe Abschnitt 10).
- Hilfsfunktionen für RLS (SECURITY DEFINER): `current_role_name()`, `is_admin()`, `owns_salon(uuid)`.
- Öffentliche RPCs: `busy_slots(salon, from, to)` (nur belegte Zeiträume, keine Kundendaten), `salons_nearby(lat,lng,radius,category,treatment)` (im Frontend ungenutzt), `next_free_slots(uuid[])`, View `available_treatments`.
- Authentifizierte RPCs: `onboard_salon(jsonb)` (nur `salon_owner`), `salon_dashboard_stats(salon)` (Besitzer oder Admin), `admin_platform_stats()` und `admin_salon_overview()` (nur Admin). Die Admin-Funktionen prüfen `is_admin()` selbst und werfen sonst `admin only`.
- Queue: `claim_notifications(limit, ids)` (`for update skip locked`) und `requeue_stuck_notifications()`, beide nur für `service_role`.

### RLS-Zusammenfassung

| Objekt | Lesen | Schreiben |
|---|---|---|
| `profiles` | eigenes Profil, Admin alles | eigenes Profil (ohne Rolle), Admin alles |
| `treatments` | alle | Admin |
| `salons` | aktive für alle, eigene für Besitzer, Admin alles | Besitzer: Insert (nur wenn Rolle `salon_owner`) und Update eigener; Admin alles |
| `salon_treatments`, `opening_hours`, `staff`, `staff_treatments` | wenn Salon aktiv oder eigener | Besitzer eigener Salon; Admin alles |
| `staff_calendars` | Besitzer, Admin (nur lesen) | Besitzer |
| `calendar_secrets` | niemand außer Service-Role | Service-Role |
| `appointments` | Kunde eigene, Besitzer des Salons, Admin | Insert: Kunde nur für aktiven Salon und aktiven Mitarbeiter dieses Salons, eigener `customer_id`, Status `confirmed`; Besitzer für eigenen Salon. Update: Kunde nur Stornierung, Besitzer, Admin |
| `notification_settings` | Besitzer; Admin lesen | Besitzer |
| `push_tokens` | eigene; Admin lesen | eigene |
| `notification_log` | Besitzer des Salons, Admin | nur Trigger und Service-Role |

Tests: `supabase/tests/database/rls.test.sql` (pgTAP, `plan(18)`, endet mit `rollback`). Abgedeckt sind Admin-Eskalation per Signup, anonyme Sicht, Buchung, Überschneidung (`23P01`), Storno-Only, Self-Promotion, `onboard_salon`, Statuswechsel und der SMS-Payload.

## 9. Auth und Rollen

- Mechanismus: Supabase Auth, E-Mail und Passwort (`signInWithPassword`, `signUp`), Client in `src/lib/supabase/client.ts` (Browser-Client mit Anon-Key; die Session liegt im Browser, es gibt kein SSR-Auth-Paket).
- `AuthProvider` (`src/components/auth-provider.tsx`) liest die Session und `onAuthStateChange`, danach die Rolle aus `profiles.role` (RLS erlaubt nur die eigene Zeile). Fehlt die Zeile, wird `customer` angenommen.
- Registrierung: `signUp` schickt `role`, `full_name`, `locale` als `user_metadata`. Der DB-Trigger `handle_new_user` erzeugt das Profil. Der Client kann nie `admin` anfordern (Typ `Exclude<UserRole,"admin">` und Trigger).
- Einstieg: `AuthModal` (Tabs Kunde und Salon), geöffnet aus `SiteHeader`. Der Salon-Tab registriert als `salon_owner` und leitet auf `/onboarding`. Ein bereits eingeloggter `salon_owner` sieht direkt den Button zum Wizard.
- Lokal ist E-Mail-Bestätigung ausgeschaltet (`supabase/config.toml`). `signUp` liefert `needsConfirmation`, wenn keine Session zurückkommt.
- Rollenprüfung im Client:
  - `/dashboard`: erlaubt `salon_owner` und `admin` (`salon-dashboard.tsx:315`).
  - `/admin`: nur `admin` (`admin-dashboard.tsx:209`).
  - `/onboarding`: Submit nur als `salon_owner` (`onboarding-wizard.tsx:95`).
  - Buchen: eingeloggt (`booking-dialog.tsx`).
- Die echte Durchsetzung liegt in RLS, Guards und RPC-Checks. Die Client-Prüfung ist nur UX.
- Admins entstehen ausschließlich per Service-Role oder SQL (`profiles.role` anheben).
- Ohne Supabase-Env (`available === false`) zeigen Dashboard und Admin Mock-Ansichten ohne Login.

## 10. Benachrichtigungen

1. **Auslösung:** Ein Kunde bucht im `BookingDialog` › `createAppointment()` fügt eine Zeile in `appointments` ein.
2. **Queueing:** Der Trigger `appointments_notify` ruft `queue_booking_notifications()` auf. Die Funktion liest `notification_settings` (fehlt die Zeile, sind alle Kanäle an) und schreibt `notification_log`-Zeilen mit `status = 'pending'` und dem Text aus `format_booking_payload()`.
   - **Push:** je Token in `push_tokens` des Salon-Besitzers.
   - **SMS:** an `notification_settings.sms_phone`, sonst `salons.phone`.
   - **E-Mail:** an `notify_email`, sonst die E-Mail des Besitzers aus `auth.users`; zusätzlich eine Zeile an `customer_email`, falls vorhanden. Der Kunde bekommt dabei denselben Salon-Payload.
3. **Auslieferung (zwei gleichwertige Implementierungen, gleiche Statuslogik):**
   - **Next.js:** `POST /api/notifications/dispatch`. Der Browser stößt nach dem Insert fire-and-forget mit dem User-Token an (`triggerDispatch()` in `booking.ts`). Zusätzlich ruft der Vercel-Cron (`vercel.json`, stündlich) per GET auf (`CRON_SECRET`). Die Logik liegt in `src/lib/notifications/dispatch.ts`.
   - **Supabase Edge Function:** `supabase/functions/dispatch-notifications/index.ts`, gedacht für Database Webhook auf `notification_log` INSERT und `pg_cron` (Einrichtung in `supabase/README.md`, nicht im Repo automatisiert).
4. **Ablauf pro Lauf:** `requeue_stuck_notifications()` (Zeilen länger als 5 min in `processing` mit weniger als 3 Versuchen werden wieder `pending`), dann `claim_notifications(25, ids)` (setzt `processing`, erhöht `attempts`), dann parallele Auslieferung.
5. **Kanäle:**
   - **Push:** `POST https://exp.host/--/api/v2/push/send` mit Titel `Appointy`; Kosten 0. `DeviceNotRegistered` löscht das Token und markiert die Zeile endgültig als `failed`.
   - **SMS:** Twilio Messages API. Nummern werden per `toE164()` normalisiert (Standard Ländervorwahl 49, überschreibbar). Kosten Default 50 000 µ€ (0,05 €). In der Next-Variante gelten die Twilio-Codes 21211 und 21614 als endgültig fehlgeschlagen.
   - **E-Mail:** Resend. Betreff ist der erste Teil des Payloads (`Neuer Termin!`), Text mit Zeilenumbrüchen, Anhang `termin.ics` (Inhalt per `icsFor()` erzeugt). Kosten Default 400 µ€.
6. **Ergebnis:** Erfolg setzt `sent`, `provider_id`, `cost_micro_eur`, `sent_at`. Fehler setzen `failed` bei endgültigen Fehlern oder nach 3 Versuchen, sonst zurück auf `pending` und es wird erneut versucht (Text `error`, auf 500 Zeichen gekürzt).
7. **Anzeige:** Das Dashboard gruppiert die letzten 60 Log-Zeilen pro Termin (`fetchDashboard()` in `src/lib/supabase/dashboard.ts`). Das Admin-Dashboard zeigt Zähler und Kosten pro Kanal aus `admin_platform_stats()`.

Einstellbar: `SMS_DEFAULT_COUNTRY_CODE`, `SMS_COST_MICRO_EUR`, `EMAIL_COST_MICRO_EUR`, `EXPO_ACCESS_TOKEN`.

## 11. Konventionen

- **Sprache:** UI-Texte nie hartcodiert, immer über `t.*` und alle 7 Wörterbücher gleichzeitig pflegen. Code-Kommentare und Bezeichner sind Englisch, Dokumentation und Kundentexte Deutsch.
- **Dateinamen:** kebab-case (`salon-card.tsx`); Komponenten PascalCase, Hooks `useXyz`, Provider heißen `XyzProvider` und exportieren einen Hook (`useLocale`, `useAuth`, `useSalonData`, `useSalonSearch`).
- **Client-Komponenten:** beginnen mit `"use client"`. `src/app/**/page.tsx` bleibt ein dünner Wrapper.
- **Datenzugriff:** pro Domäne ein Modul in `src/lib/supabase/`. Es kapselt Tabellen- und RPC-Namen und mappt snake_case auf camelCase-Typen. Jede Funktion beginnt mit `db()` oder prüft `supabase` und wirft bei `null`. Komponenten fallen auf Mock-Daten zurück. Neue Features brauchen sowohl einen Live- als auch einen Mock-Pfad (Muster `SalonDashboard` › `Live…`/`Mock…` › gemeinsame `…View`).
- **Datenbank:** neue Migrationen als `supabase/migrations/000N_name.sql`; RLS bei jeder neuen Tabelle aktivieren; Rechteprüfung in der DB (RLS, Guards, SECURITY DEFINER mit `set search_path = public`); `alter type … add value` in eine eigene Migration (siehe Kommentar in `0002`).
- **Styling:** nur semantische Token-Klassen, nie Hex oder `oklch()` in Komponenten. Zusammensetzen mit `cn()`. Neue shadcn-Komponenten mit `npx shadcn add` (Style `base-nova`).
- **Kein blindes Verallgemeinern:** keine Gradient-Headlines, keine Glass-Panels außer Header.
- **Motion:** nur der Hero ist scroll-gescrubbt. Sonst einmalige `whileInView`-Animation oder `AnimatePresence`. Neue Hero-Transforms hängen an `scrollYProgress`.
- **React-19-Lint:** Kein `setState` im Effect für abgeleitete Werte. Stattdessen `useSyncExternalStore` (Locale, `useMounted`), Ableitung beim Rendern (`LocationAutocomplete`) oder Schlüsselvergleich (`BookingDialog`: `busyKey`). Die Regel `react-hooks/set-state-in-effect` schlägt sonst an.
- **Zeiten:** Datenbank in `timestamptz`, serverseitige Formatierung und Wochenlogik in `Europe/Berlin`; der Client rechnet mit der lokalen Browserzeit.
- **Kein Backend-Code im Client:** `src/lib/notifications/dispatch.ts` braucht den Service-Role-Key und darf nicht in Client-Komponenten importiert werden.
- **Footer:** keine Sprachwahl (sie gehört nur in den Header, `src/components/language-switcher.tsx`) und kein "Built by"-Hinweis.

## 12. Skills und Setup

Verzeichnis: `.claude/skills/`. Nur vier Skills sind als echte Ordner mit Inhalt im Repo:

| Skill | Zweck |
|---|---|
| `anti-ai-slop/` | Verhindert und prüft generische KI-Ästhetik bei Websites. Enthält `SKILL.md`, `references/` (copywriting, imagery, layouts, motion, review-checklist, typography, ux, visual-design) und `examples/`. Für dieses Projekt zentral |
| `cinematic-web-motion/` | Cinematic-, Scroll- und 3D-Erlebnisse (GSAP/ScrollTrigger, Video-Scrubbing, Three.js, Typografie-Motion, Performance, Mobile, Accessibility, AI-Video-Pipeline und Prompt-Engineering) |
| `brand-material/` | Druckfertiges Marketingmaterial (Flyer, Visitenkarten, Poster, Social Posts) aus der vorhandenen Website-Identität |
| `kie-creative/` | Bild- und Videoerzeugung über den MCP-Server `pje-creative-mcp` (KIE.ai): generieren, bearbeiten, animieren, hochskalieren |

Die übrigen Einträge sind 30–50 Byte große Textdateien, die auf `../../.agents/skills/<name>` verweisen (kaputte Symlinks, wohl unter Windows als Text eingecheckt). Das Verzeichnis `.agents/` existiert im Repo nicht, der Inhalt ist deshalb hier nicht prüfbar. Die Namen deuten auf folgende Zwecke hin:
- Design: `brandkit`, `design-taste-frontend`, `design-taste-frontend-v1`, `gpt-taste`, `high-end-visual-design`, `industrial-brutalist-ui`, `minimalist-ui`, `stitch-design-taste`, `redesign-existing-projects`.
- Bild/Video (Higgsfield): `higgsfield-brandkit`, `higgsfield-generate`, `higgsfield-marketplace-cards`, `higgsfield-product-photoshoot`, `higgsfield-soul-id`, `higgsfield-video-explainer`, `higgsfield-websites`, `higgsfield-youtube-thumbnail`.
- Sonstige: `find-skills`, `full-output-enforcement`, `image-to-code`, `imagegen-frontend-mobile`, `imagegen-frontend-web`.

`.gitignore` schließt `.claude/skills/.trash/` und `.claude/skills/synced/` aus. Die Dateien `.claude/skills/.DS_Store` und alle Stubs sind eingecheckt.

Agent-Hinweise im Repo: `CLAUDE.md` (Architektur und Entscheidungen, importiert `AGENTS.md`) und `AGENTS.md` (Warnung zu Next.js 16; der Block wird von `next dev` neu geschrieben).

## 13. Lokale Entwicklung

### Befehle

```bash
npm install
npm run dev        # next dev (Turbopack), http://localhost:3000
npm run build      # next build
npm run start      # next start
npm run lint       # eslint
```

Es gibt kein `npm test`. Datenbank mit Docker und Supabase-CLI (laut `supabase/README.md`):

```bash
npx supabase start          # lokale Postgres/Auth/Storage/Edge-Runtime
npx supabase db reset       # Migrationen 0001–0004 anwenden
npx supabase test db        # pgTAP (tests/database/*.sql)
npx supabase db lint
npx supabase functions serve dispatch-notifications --env-file ./supabase/.env.local
```

Ohne Env-Variablen startet die App im reinen Mock-Modus (kein Login, Demo-Daten).

### Env-Variablen (nur Namen)

Next.js, `.env.local` (Vorlage `.env.example`, Datei ist per `.gitignore` ausgeschlossen):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Browser, schalten den Live-Modus ein)
- `SUPABASE_SERVICE_ROLE_KEY` (nur Server)
- `DISPATCH_SECRET`, `CRON_SECRET`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (alternativ `TWILIO_FROM` oder `TWILIO_MESSAGING_SERVICE_SID`)
- `RESEND_API_KEY`, `RESEND_FROM`

Im Code gelesen, aber nicht in `.env.example`: `TWILIO_FROM`, `TWILIO_MESSAGING_SERVICE_SID`, `EXPO_ACCESS_TOKEN`, `SMS_DEFAULT_COUNTRY_CODE`, `SMS_COST_MICRO_EUR`, `EMAIL_COST_MICRO_EUR`.

Supabase Edge Function (per `supabase secrets set`): `DISPATCH_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` oder `TWILIO_MESSAGING_SERVICE_SID`, `RESEND_API_KEY`, `RESEND_FROM`, optional `EXPO_ACCESS_TOKEN`, `SMS_COST_MICRO_EUR`, `EMAIL_COST_MICRO_EUR`, `SMS_DEFAULT_COUNTRY_CODE`. `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` setzt die Plattform selbst.

Bei der Edge Function ist der Twilio-Absender `TWILIO_FROM`. Die Next-Variante akzeptiert zusätzlich `TWILIO_PHONE_NUMBER`.

## 14. Offene Punkte und Inkonsistenzen

**Funktional**
1. Zwei parallele Dispatcher: `src/lib/notifications/dispatch.ts` und `supabase/functions/dispatch-notifications/index.ts` duplizieren die Logik und driften schon auseinander (Twilio-Fehlercodes 21211/21614 nur in der Next-Variante, andere Env-Namen, andere Authentifizierung). Es sollte ein einziger Weg gelten.
2. Takt: `vercel.json` ruft die Route nur stündlich auf, das `supabase/README.md` empfiehlt jede Minute. Auf Vercel Hobby sind stündliche Crons wahrscheinlich das Maximum, nicht geprüft. Zeitnahe Auslieferung hängt daher am Client-Aufruf `triggerDispatch()` oder dem Webhook, der nicht automatisiert eingerichtet ist.
3. Push kann aktuell nie ankommen: es gibt keine App, die `push_tokens` anlegt, und der "registriert"-Status im Dashboard ist rein lokal.
4. Kunden-E-Mail ist der Salon-Payload ("Kunde: … Tel: …"), keine Bestätigung für den Kunden. Betreff immer nur "Neuer Termin!". Im `.ics` steht `treatment_id` statt des Labels.
5. `requeue_stuck_notifications()` rechnet mit `created_at` statt dem Zeitpunkt des Claims. Ältere Zeilen werden dadurch sofort als "hängend" erneut eingereiht. `attempts` begrenzt den Schaden auf 3 Versuche.
6. Fehlt für einen Salon die Zeile in `notification_settings`, gelten alle Kanäle als aktiv (Fallback im Trigger). Die Dashboard-Schalter legen die Zeile erst per `upsert` an.
7. Zeitzonen: Die Datenbank rechnet fest mit `Europe/Berlin`, `computeSlots()` im Browser mit der lokalen Zeit. Abweichende Browser-Zeitzonen können Slots gegenüber Öffnungszeiten verschieben.
8. Das Dashboard lädt nur den ersten Salon eines Besitzers (`fetchOwnerSalon`, `limit(1)`).
9. `onboard_salon` setzt für alle Mitarbeiter alle Behandlungen und vergibt keine Preise oder Dauer. Das Onboarding fragt außerdem keine Kategorie ab; sie wird geraten.
10. Salons außerhalb der 9 PLZ in `src/lib/geo.ts` bekommen beim Onboarding `lat/lng = null` und tauchen dann in Radiussuche und Geo-Features nicht auf. `salons_nearby()` in der DB ist ungenutzt.
11. `fetchSalons()` setzt `nextSlot: ""` und füllt `nextSlotAt` erst per Polling nach. Der Mock-Text bleibt daher für Mock-Salons.
12. Die Suche nach Datum und Tageszeit (`filterSalons`, `salonAvailability`) basiert auf einem Mock-Muster pro Salon-ID. Live-Salons haben keine solche Daten und gelten immer als verfügbar.
13. Kein Routenschutz und keine Middleware. Auth nur im Browser (kein `@supabase/ssr`).
14. Auth fehlt: Passwort-Reset, E-Mail-Bestätigungsseite. `supabase/config.toml` nennt `additional_redirect_urls = ["http://localhost:3000/auth/callback"]`, die Route existiert nicht.
15. Das Bearer-Token jedes eingeloggten Nutzers genügt, um den Dispatcher auszulösen (bewusst dokumentiert, in `route.ts` begründet). Rate-Limit fehlt.
16. Footer-Links (Preise, Über uns, Karriere, Presse, Blog, Impressum, Datenschutz, AGB, Cookies) zeigen auf `#`.

**Dokumentation und Repo**
17. `README.md` ist der unveränderte `create-next-app`-Text und enthält am Ende eine Zeile "ScanMe" (vermutlich Rest aus einem anderen Projekt). Erwähnt Geist-Font, das Projekt nutzt Fraunces und Inter.
18. `CLAUDE.md` ist teilweise veraltet: Es beschreibt Backend, Buchung und Benachrichtigungen nicht ("No backend yet … everything is mock data"). Außerdem beschreibt es die Suche ohne Datum, Zeitfenster und Geolocation, und der Abschnitt "Footer" nennt noch eine Sprachauswahl im Footer, die es nicht mehr gibt.
19. `.env.example` ist unvollständig (siehe Abschnitt 13). `.env.local` existiert lokal mit denselben Namen.
20. `supabase/README.md` meldet selbst, dass SQL, pgTAP und Edge Function noch nie ausgeführt wurden. Es gibt keine CI-Konfiguration (kein `.github/`).
21. Kaputte Skill-Stubs in `.claude/skills/` (siehe Abschnitt 12).
22. Ungenutzte Abhängigkeiten: `clsx` und `tailwind-merge` stehen in `package.json`, werden aber in `src/` nirgends importiert, weil `cn` aus dem Paket `cn` kommt (`src/lib/utils.ts`). `shadcn` ist als Laufzeit-Dependency nur wegen `@import "shadcn/tailwind.css"` in `globals.css` nötig.
23. `public/` enthält nur Next-Template-Assets; es gibt kein eigenes Favicon-Branding außer `src/app/favicon.ico`, kein OG-Bild.
24. Metadata (`layout.tsx`) ist statisch Deutsch, kein `generateMetadata` je Sprache oder Seite; keine Seiten-eigenen Titel für `/salons`, `/dashboard`, `/admin`.
25. Mock-Konstante, die man nicht versehentlich ändert: Kein Mock-Salon in `src/lib/mock-data.ts` bietet `makeup` an. Damit wird das Freischalten der nicht-zentralen Behandlungsfilter demonstriert (laut `CLAUDE.md`).
