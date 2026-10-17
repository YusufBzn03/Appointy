@AGENTS.md

# Appointy

Booking platform for the beauty & care industry (barbers, hair salons, nail studios, spas, etc. — Planity-style utility, bespoke premium visual identity, deliberately not glossy/generic — see `.claude/skills/anti-ai-slop`). Surfaces: public landing page, `/salons` search results with a booking dialog, a B2B onboarding wizard, a salon dashboard and a super-admin dashboard.

Backend: Supabase (Auth, Postgres with RLS, Storage, one Edge Function) is wired in. The app only falls back to the mock data in `src/lib/mock-data.ts` when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing (or a salon query fails) — see "Backend" below. `PROJECT_OVERVIEW.md` has the full file-by-file reference, DB tables and open issues.

## Stack

- Next.js 16 (App Router, TypeScript), React 19
- Supabase (`@supabase/supabase-js`), Twilio (SMS), Resend (e-mail), Expo Push, Vercel Cron — see "Backend"
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css`, no `tailwind.config.*`)
- shadcn/ui (`base-nova` style, Base UI primitives, components in `src/components/ui`)
- Framer Motion for all scroll/entrance motion
- `next-themes` for dark/light mode (class-based, `attribute="class"`)
- Lucide React for icons
- Fonts: `Fraunces` (display/headings, `font-heading`) + `Inter` (body/UI, `font-sans`), loaded via `next/font/google` in `src/app/layout.tsx`

## Design system

- Palette: warm sand/cream light mode, deep obsidian dark mode, emerald primary, champagne/gold accent. All tokens are OKLCH CSS variables in `globals.css` (`:root` / `.dark`), consumed through the shadcn `@theme inline` mapping — never hardcode colors in components, use the semantic Tailwind classes (`bg-background`, `text-muted-foreground`, `bg-primary`, etc.).
- `--radius` is set generously (`1.1rem`) for the Apple-like rounded feel; shadcn derives `--radius-sm/md/lg/xl/2xl/3xl/4xl` from it.
- Utility classes added on top of shadcn's defaults (`src/app/globals.css` `@layer utilities`): `.glass` (frosted backdrop-blur, sticky header only) and `.grain-overlay` (subtle SVG noise, used once on the salon-card photo tiles to sell the "photograph" illusion). There is deliberately no gradient-text or glassmorphism-everywhere utility — an earlier pass had both and stripped them for reading too generic/AI-templated; don't reintroduce blanket glass panels or gradient headline text without a specific reason.
- Any section that should look like a dark SaaS panel regardless of site theme wraps itself in a `.dark` class div (see `partners-section.tsx`) rather than duplicating dark-mode colors.
- Salon cards with no real photo use a duotone gradient (`salon.gradient` in mock data) plus a large serif monogram of the salon's first letter — an intentional editorial-directory device, not a placeholder. Don't swap it for a plain color block.

## Animation architecture

- **Hero (`hero-section.tsx`)**: the only complex scroll-scrubbed sequence. Uses Framer Motion `useScroll({ target, offset: ["start start", "end end"] })` over a `h-[220vh]` section with a `sticky top-0 h-screen` inner container. Headline/search fade+lift out early (progress 0–0.3), the booking-preview mockup scales up, un-rotates and tightens its border radius (progress 0.12–0.62) to feel like it "locks" into place. All motion reads from the same `scrollYProgress` value — see the mapping comments if you extend it, and keep new transforms on that same timeline rather than adding independent scroll listeners.
- **Header (`site-header.tsx`)**: category shortcut row collapses (`opacity`/`height`) based on window `scrollY` via `useTransform`, not React state, to stay smooth.
- Everything else uses restrained, one-shot `whileInView` entrance animation (salon cards stagger slightly, partner revenue bars grow in) or `AnimatePresence` for discrete state changes (the 3-step booking demo in `customers-section.tsx`). Per the motion-hierarchy principle, secondary content does not scroll-scrub — only the hero does.
- `prefers-reduced-motion` is handled globally in `globals.css` (collapses transition/animation durations); the scroll-linked hero transforms still apply instantly rather than animating, since they're driven by scroll position, not a running animation loop.

## Internationalization

`src/lib/i18n/` — 7 languages: `de` (default), `en`, `tr`, `ar` (RTL), `fr`, `sr` (Latin script), `ru`.

- `types.ts` defines the `Dictionary` interface (source of truth for every translatable key); each `dictionaries/<locale>.ts` file is typed `: Dictionary`, so TypeScript itself fails the build if any language is missing a key — keep it that way rather than loosening the type.
- `locales.ts` holds per-locale metadata (`nativeName`, `dir`). Adding a language means: add the `LocaleCode`, add a dictionary file, add an entry to `locales`.
- `src/components/locale-provider.tsx` is a client Context (`useLocale()` → `{ locale, setLocale, t, dir }`). Locale persists to `localStorage` (`appointy-locale`) and is read via `useSyncExternalStore` (not `useEffect` + `setState`, which trips the `react-hooks/set-state-in-effect` lint rule and causes a hydration-mismatch flash). `setLocale` also imperatively sets `document.documentElement.lang`/`dir` — RTL for Arabic flips the whole layout for free via native CSS (flex/grid direction follows `dir`), no manual RTL classes needed anywhere.
- There is **no routing-based i18n** (no `/en/`, `/de/` URL prefixes) — locale is a client-side preference, not part of the URL. If real i18n routing/SEO is ever needed, that's a deliberate architecture change, not an incremental tweak.
- Fixed-format business content (the notification payload) is intentionally left in German regardless of UI language — it represents what the salon's phone actually receives, not translated UI chrome. The real payload is built in the DB by `format_booking_payload()` (`Neuer Termin! DD.MM.YYYY HH:MM Uhr | <Behandlung> | Kunde: <Name> | Tel: <Telefon>`), using `treatments.label_de`, which must be kept in sync with `dictionaries/de.ts` by hand. The onboarding wizard shows a static preview of it. Any such literal-text-in-RTL-context needs `dir="ltr"` on that element (see `onboarding-wizard.tsx`) or the Unicode bidi algorithm reorders/wraps it badly.
- `profiles.locale` has a CHECK constraint listing the 7 codes (`0001_init.sql`); a new language also needs a migration.
- Not localized (deliberate scope cut): salon/staff names, city names, relative-day strings in mock `nextSlot`/SMS-log timestamps (`"Heute, 16:30"` etc.) and admin `industry` labels (mock data only), plus the static German page `metadata` in `layout.tsx`. Live "next free slot" times are formatted per locale via `formatRelativeDateTime()` in `src/lib/format.ts`.

## Treatments & dynamic filter

`src/lib/mock-data.ts`: `treatmentDefs` is the master list of `TreatmentId`s, each flagged `core: boolean`. Core treatments (haircut, coloring, perm, beard) always show in the public filter bar; non-core ones (nails, pedicure, facial, waxing, massage, makeup, lashes) only appear once at least one `Salon.treatments` array includes them — computed by `unlockedTreatments(salons)`. `treatmentLabel(t, id)` resolves the translated label. The mock salons deliberately leave `makeup` unclaimed by any salon so the "only unlocks when offered" behavior is visibly demonstrated — don't add makeup to a salon without removing that demonstration or intentionally accepting the loss.

The header's treatment shortcut row (`site-header.tsx`) is horizontally scrollable (`overflow-x-auto`, hidden scrollbar) rather than clipped — translated labels are long enough that a full 9–11-item row doesn't fit any reasonable viewport width. Don't remove `overflow-x-auto`/`shrink-0`/`whitespace-nowrap` there or items silently disappear behind the parent's `overflow-hidden` (used for the row's collapse-on-scroll height animation).

With Supabase configured, the treatment filter comes from the `available_treatments` view (`availableTreatmentIds` in `salon-data-provider.tsx`); on mock data it is derived with `unlockedTreatments(salons)` as described above (`site-header.tsx` picks whichever is available).

## Working search (category + location + date + time window + geolocation)

This is a distinct axis from treatments above: `SalonCategory` (`barber` | `friseur` | `kosmetik` | `nagelstudio` | `spa`) is a business-type field on `Salon`, not derived from treatments — a salon has both a `category` and a `treatments[]` list. `salonCategories`/`categoryLabel()` in `mock-data.ts` mirror the `treatmentDefs`/`treatmentLabel()` pattern.

- `src/components/search-provider.tsx` — a client Context (`useSalonSearch()` → `{ category, location, date, window, coords, setters…, results, isFiltered, reset, submitSearch }`). `date` is an ISO day (`YYYY-MM-DD`), `window` a `TimeWindow` (`"any" | "morning" | "afternoon" | "evening"`), `coords` the browser geolocation set by the hero's "near me" action (`navigator.geolocation`); typing a location clears `coords`. Salons come from `useSalonData()` (Supabase or mock). Both the hero's big search bar and the header's compact one read/write the *same* state, so they always stay in sync; `SalonShowcase` renders `results` instead of the raw `salons` array, with an empty-state + "reset filters" affordance when nothing matches. `/` and `/salons` each open their own `SearchProvider`.
- `filterSalons(pool, { category, location, origin, date, window })` in `mock-data.ts` applies, in order: category, `origin` (geolocation, 20 km), date/window, then the typed location. Date/window filtering uses the mock `salonAvailability` table keyed by salon id (closed weekdays + time windows); salons not listed there — including all live Supabase salons — count as always available. Real availability is only used for the "next free slot" label (`next_free_slots()`) and in the booking dialog.
- The category `<Select>` (shadcn/Base UI) needs a `children` render-function on `SelectValue`, not just a `placeholder` prop — Base UI, unlike Radix, does not auto-resolve the trigger's display text from the matching `SelectItem`; without it the trigger shows the raw stored value (e.g. literally `"all"`) instead of the translated label. See the `SelectValue` usage in `hero-section.tsx` / `site-header.tsx` for the pattern.
- `src/lib/geo.ts` — a **hand-picked** `locations[]` directory (postal code + city + lat/lng for the ~9 places actually used in mock data), a `postalCodeGeo` lookup derived from it, plus a Haversine `distanceKm()`. `filterSalons()` in `mock-data.ts` uses it: typing a postal code that's in the table filters to salons within 20 km (real straight-line distance, not a live geocoding API); typing anything else falls back to a plain substring match against `city`/`postalCode`. Salon coordinates come from `Salon.lat/lng` (Supabase rows) or, for mock salons, from `postalCodeGeo`. Onboarded salons in a postal code missing from `locations` get `lat/lng = null` (`submitOnboarding`) and drop out of radius search. This is why Gunzenhausen salons (STARCUT, Alex Barber Shop) don't show up for "91757" within 20 km — real coordinates put them at ~21 km beeline, just outside the radius, even though they were added for "barbers near Treuchtlingen" testing. Adding a new mock salon in a city that isn't in `locations` silently falls back to substring matching for it (no radius filtering, no autocomplete suggestions) — add it to `locations` if it should participate in both.

## Search flow: landing page → `/salons`, autocomplete, transition

The search widget (category select + location field + Suchen button) lives on the landing page (`/`); results live on their own route, `/salons` — clicking Suchen never shows results in place, it navigates.

- `src/components/location-autocomplete.tsx` — wraps the location `<Input>` with a suggestions dropdown from `suggestLocations()` (postal-code-prefix or city-substring match against `src/lib/geo.ts`'s `locations[]`). It keeps two pieces of state on purpose: the *displayed* text (what the user sees — collapses to the city name once a full postal code matches, per the explicit "once the PLZ is fully typed, show only the town" requirement) and the *submitted* value passed to `onChange`/the search context (stays the postal code, so 20 km radius filtering in `filterSalons()` keeps working — do not collapse these two into one state, you'd silently break radius search by replacing the postal code with a city string). No keyboard arrow-navigation of suggestions is implemented, only click-to-select and Enter-to-submit — a deliberate scope cut.
- `src/components/search-provider.tsx`'s `submitSearch()` builds a `?category=&location=&near=&date=&window=` query string (only the set params), flips `isNavigating` to show `<SearchTransitionOverlay>` (a brief fixed full-screen overlay, ~650 ms, see `TRANSITION_MS`) and then calls `router.push("/salons?...")` after that delay — the delay is deliberate (real navigation here is instant since everything is static/client-rendered; the pause is purely for the "cool but not exaggerated" transition the user asked for, not real loading time). `SearchProvider` also accepts `initialCategory`/`initialLocation`/`initialDate`/`initialWindow`/`initialCoords` props so a fresh page can seed its filters from the URL.
- `/salons` (`app/salons/page.tsx` → `salons-page-client.tsx`) reads `category`/`location`/`near`/`date`/`window` from `useSearchParams()` (wrapped in `<Suspense>`, required by Next.js for `useSearchParams`) and opens its own `SearchProvider` instance seeded from them. It reuses `SiteHeader`/`SiteFooter`/`SalonShowcase` — there is no shared client-side state between `/` and `/salons` beyond the URL query string; each page's `SearchProvider` is independent.
- `src/components/salon-card.tsx` is shared by `/salons`'s full filterable grid and the landing page's `partner-showcase.tsx` (a small, non-filterable "trusted by these salons" credibility section showing the first 3 salons, not connected to search state), so both render identical cards. Each card owns a `BookingDialog` (see "Booking flow").
- When composing a shadcn `Button` with `render={<Link .../>}` (Base UI), you must also pass `nativeButton={false}` — otherwise Base UI logs a console error because it expects its `render` target to be a real `<button>` unless told otherwise. See `partner-showcase.tsx`.

## Global chrome: language switcher, back-to-top

- The language switcher lives **only** in `SiteHeader` now (`LanguageSwitcher`) — `SiteFooter` no longer has one, by explicit request ("Sprachauswahl soll stets oben sein"). Don't re-add a `<select>`/locale control to the footer.
- `src/components/back-to-top.tsx` is mounted once, globally, in `app/layout.tsx` (not per-page) — a fixed bottom-right button that fades in past `window.scrollY > 640` and smooth-scrolls to top on click. It uses a plain `scroll` event listener + `useState`, not a Framer Motion scroll hook, since it needs a hard visibility threshold rather than a continuous transform.

## Backend (Supabase)

- `src/lib/supabase/client.ts` exports `supabase`, which is `null` when the two `NEXT_PUBLIC_SUPABASE_*` env vars are missing. Every module in `src/lib/supabase/` (`salons`, `booking`, `onboarding`, `dashboard`, `admin`) throws on `null`; components check `supabase !== null` / `useAuth().available` and use the mock path instead. New features need both a live and a mock path (pattern: `SalonDashboard` → `LiveDashboardView` | `MockDashboard` → shared `DashboardView`).
- `SalonDataProvider` (`salon-data-provider.tsx`, mounted in `layout.tsx`) is the single source of salons: Supabase rows if available, otherwise (or if the query fails) the mock list. It polls `next_free_slots()` every 60 s and exposes `refreshSlots()` (called after a booking).
- Schema, RLS, triggers and RPCs live in `supabase/migrations/0001`–`0004`; pgTAP tests in `supabase/tests/database/rls.test.sql`; setup/test instructions in `supabase/README.md`. Authorization is enforced in the DB (RLS, guard triggers, `SECURITY DEFINER` RPCs that check `is_admin()` / `owns_salon()`), the client-side role checks are UX only. New migrations are numbered `000N_*.sql`; `alter type … add value` goes in its own migration.
- Auth (`auth-provider.tsx`): Supabase email/password. Sign-up passes `role`/`full_name`/`locale` as user metadata and the `handle_new_user()` trigger creates the `profiles` row — only `customer` and `salon_owner` can be requested; `admin` is granted solely via service role/SQL. The role is read from `profiles`. There is no middleware/route protection, and no password reset yet.
- `src/lib/notifications/dispatch.ts` is server-only (needs `SUPABASE_SERVICE_ROLE_KEY`) — never import it from client code. Env var names are listed in `.env.example` (that file is incomplete; see `PROJECT_OVERVIEW.md` §13).

## Booking flow

`SalonCard` → `BookingDialog` (`booking-dialog.tsx`): treatment → staff (or "any") → time → confirm → done. Treatments, staff and opening hours come from `fetchBookingData()`; busy ranges from the `busy_slots()` RPC (no customer data exposed); `computeSlots()` (`src/lib/supabase/booking.ts`) builds 30-minute-grid slots in the browser's local time with a 30-minute lead, assigning the first free eligible staff member. Booking requires a signed-in user and only works for live (Supabase) salons. `createAppointment()` inserts into `appointments`; double bookings are rejected by the `appointments_no_overlap` exclusion constraint (error `23P01` → "slot taken"). Customers can only cancel, never edit, their appointments (`appointments_guard`); there is no customer-facing "my appointments" UI yet.

## Notification pipeline

1. The `appointments` insert fires the `appointments_notify` trigger → `queue_booking_notifications()`, which writes `notification_log` rows (`status = 'pending'`) per enabled channel from `notification_settings` (missing row = all on): push per `push_tokens` of the owner, SMS to `sms_phone` or the salon phone, e-mail to the owner (+ the customer if `customer_email` is set). The text is the fixed German payload from `format_booking_payload()`.
2. A dispatcher claims rows atomically (`claim_notifications()`, `for update skip locked`; stuck rows are re-queued by `requeue_stuck_notifications()`) and delivers them: Expo Push, Twilio SMS, Resend e-mail (with a `.ics` attachment). Success → `sent` + `provider_id` + `cost_micro_eur`; failure → back to `pending`, `failed` after 3 attempts or on permanent errors (invalid Expo token, invalid phone number).
3. Two equivalent dispatcher implementations exist: the Next route `POST|GET /api/notifications/dispatch` (`src/app/api/notifications/dispatch/route.ts` + `src/lib/notifications/dispatch.ts`; triggered by the browser right after a booking via `triggerDispatch()`, and by the hourly Vercel Cron in `vercel.json`) and the Supabase Edge Function `supabase/functions/dispatch-notifications/index.ts` (for a Database Webhook / `pg_cron`, wiring documented in `supabase/README.md`, not automated). Change both when changing delivery logic. Auth: `x-dispatch-secret` = `DISPATCH_SECRET`, `Authorization: Bearer <CRON_SECRET>`, or (Next route only) a valid Supabase user token.
4. The dashboards read it back: the salon dashboard groups the latest `notification_log` rows per appointment; the admin dashboard uses `admin_platform_stats()` for per-channel counts and costs.

## B2B onboarding, dashboards

- `/onboarding` (`onboarding-wizard.tsx`): 6-step wizard (path → business → treatments → SMS → calendar/team → review). With Supabase configured and a signed-in `salon_owner`, submit calls `submitOnboarding()` → RPC `onboard_salon()` (one transaction: salon with `status = 'pending'`, treatments, opening hours, staff, notification settings); an admin must approve the salon before it is public. The address must contain a 5-digit postal code + city (`parseAddress()`), the category is inferred from the treatments (`inferCategory()`), prices/durations are not collected and custom treatments are not persisted. Without Supabase the wizard is a simulation. The "auto-fetch" path simulates a Google-Places-style lookup with a `setTimeout` and derives fake business data from the entered URL — there is no real API call. Manual and auto paths converge on the same editable business-details form.
- `/dashboard` (`salon-dashboard.tsx`): tabbed salon-owner view (Overview stats, multi-staff calendar, team list, treatments management, SMS hub + log). Live mode (`salon_owner`/`admin`) loads the owner's first salon via `src/lib/supabase/dashboard.ts` (stats from `salon_dashboard_stats()`, treatment on/off, channel toggles persisted); without Supabase it shows mock state.
- `/admin` (`admin-dashboard.tsx`): platform-wide stats + a salon audit table with working Approve/Suspend actions. Live mode (role `admin`) uses `admin_platform_stats()`, `admin_salon_overview()` and `setSalonStatus()`; MRR shows "—" (no billing data). Mock mode keeps local state.
- The shared entry point is `auth-modal.tsx` (customer login/signup vs. salon-partner tabs, opened from the header's login / become-a-salon buttons) — the salon tab signs up as `salon_owner` and hands off to the full `/onboarding` page rather than trying to fit the whole wizard inside a modal.
- Still UI-only simulations: Google Places/website scraping, Google Calendar/Outlook OAuth (the `staff_calendars`/`calendar_secrets` tables exist, nothing writes them), push-token registration (`pushRegistered` is local state; no app creates `push_tokens`), and payment/MRR data. Salon photo upload is not built either (bucket `salon-photos` exists).

## Footer

Link columns only (discover/for customers/for salons/pricing; company; legal: Impressum, Datenschutz, AGB, Cookies — most targets are still `#`). **No language selector** (see "Global chrome") and no third-party "built by" credit — explicitly declined for this project.

## Notes for future work

This Next.js version (16.x) differs from older training data — check `node_modules/next/dist/docs/` for current APIs before assuming behavior (route `LayoutProps<"/">`/`PageProps` helper types, etc. are already in use in `layout.tsx`).
