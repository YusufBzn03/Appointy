@AGENTS.md

# Appointy

Booking platform for the beauty & care industry (barbers, hair salons, nail studios, spas, etc. — Planity-style utility, bespoke premium visual identity, deliberately not glossy/generic — see `.claude/skills/anti-ai-slop`). No backend yet: everything is mock data plus client-side state, across the public landing page, a B2B onboarding wizard, a salon dashboard and a super-admin dashboard.

## Stack

- Next.js 16 (App Router, TypeScript), React 19
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
- Fixed-format business content (the SMS payload template in the onboarding wizard) is intentionally left in German/Latin regardless of UI language — it represents what the salon's phone actually receives, not translated UI chrome. Any such literal-text-in-RTL-context needs `dir="ltr"` on that element (see `onboarding-wizard.tsx`) or the Unicode bidi algorithm reorders/wraps it badly.
- Not localized (deliberate scope cut, mock data only): salon/staff names, city names, and relative-day strings in mock `nextSlot`/SMS-log timestamps (`"Heute, 16:30"` etc.) and admin `industry` labels. These are illustrative demo content, not UI copy.

## Treatments & dynamic filter

`src/lib/mock-data.ts`: `treatmentDefs` is the master list of `TreatmentId`s, each flagged `core: boolean`. Core treatments (haircut, coloring, perm, beard) always show in the public filter bar; non-core ones (nails, pedicure, facial, waxing, massage, makeup, lashes) only appear once at least one `Salon.treatments` array includes them — computed by `unlockedTreatments(salons)`. `treatmentLabel(t, id)` resolves the translated label. The mock salons deliberately leave `makeup` unclaimed by any salon so the "only unlocks when offered" behavior is visibly demonstrated — don't add makeup to a salon without removing that demonstration or intentionally accepting the loss.

The header's treatment shortcut row (`site-header.tsx`) is horizontally scrollable (`overflow-x-auto`, hidden scrollbar) rather than clipped — translated labels are long enough that a full 9–11-item row doesn't fit any reasonable viewport width. Don't remove `overflow-x-auto`/`shrink-0`/`whitespace-nowrap` there or items silently disappear behind the parent's `overflow-hidden` (used for the row's collapse-on-scroll height animation).

## Working search (category + location)

This is a distinct axis from treatments above: `SalonCategory` (`barber` | `friseur` | `kosmetik` | `nagelstudio` | `spa`) is a business-type field on `Salon`, not derived from treatments — a salon has both a `category` and a `treatments[]` list. `salonCategories`/`categoryLabel()` in `mock-data.ts` mirror the `treatmentDefs`/`treatmentLabel()` pattern.

- `src/components/search-provider.tsx` — a client Context (`useSalonSearch()` → `{ category, setCategory, location, setLocation, results, isFiltered, reset }`) wrapping the landing page in `app/page.tsx`. Both the hero's big search bar and the header's compact one read/write the *same* state, so they always stay in sync; `SalonShowcase` renders `results` instead of the raw `salons` array, with an empty-state + "reset filters" affordance when nothing matches.
- The category `<Select>` (shadcn/Base UI) needs a `children` render-function on `SelectValue`, not just a `placeholder` prop — Base UI, unlike Radix, does not auto-resolve the trigger's display text from the matching `SelectItem`; without it the trigger shows the raw stored value (e.g. literally `"all"`) instead of the translated label. See the `SelectValue` usage in `hero-section.tsx` / `site-header.tsx` for the pattern.
- `src/lib/geo.ts` — a **hand-picked** `locations[]` directory (postal code + city + lat/lng for the ~9 places actually used in mock data), a `postalCodeGeo` lookup derived from it, plus a Haversine `distanceKm()`. `filterSalons()` in `mock-data.ts` uses it: typing a postal code that's in the table filters to salons within 20 km (real straight-line distance, not a live geocoding API); typing anything else falls back to a plain substring match against `city`/`postalCode`. This is why Gunzenhausen salons (STARCUT, Alex Barber Shop) don't show up for "91757" within 20 km — real coordinates put them at ~21 km beeline, just outside the radius, even though they were added for "barbers near Treuchtlingen" testing. Adding a new mock salon in a city that isn't in `locations` silently falls back to substring matching for it (no radius filtering, no autocomplete suggestions) — add it to `locations` if it should participate in both.

## Search flow: landing page → `/salons`, autocomplete, transition

The search widget (category select + location field + Suchen button) lives on the landing page (`/`); results live on their own route, `/salons` — clicking Suchen never shows results in place, it navigates.

- `src/components/location-autocomplete.tsx` — wraps the location `<Input>` with a suggestions dropdown from `suggestLocations()` (postal-code-prefix or city-substring match against `src/lib/geo.ts`'s `locations[]`). It keeps two pieces of state on purpose: the *displayed* text (what the user sees — collapses to the city name once a full postal code matches, per the explicit "once the PLZ is fully typed, show only the town" requirement) and the *submitted* value passed to `onChange`/the search context (stays the postal code, so 20 km radius filtering in `filterSalons()` keeps working — do not collapse these two into one state, you'd silently break radius search by replacing the postal code with a city string). No keyboard arrow-navigation of suggestions is implemented, only click-to-select and Enter-to-submit — a deliberate scope cut.
- `src/components/search-provider.tsx`'s `submitSearch()` builds a `?category=&location=` query string, flips `isNavigating` to show `<SearchTransitionOverlay>` (a brief fixed full-screen overlay, ~650 ms, see `TRANSITION_MS`) and then calls `router.push("/salons?...")` after that delay — the delay is deliberate (real navigation here is instant since everything is static/client-rendered; the pause is purely for the "cool but not exaggerated" transition the user asked for, not real loading time). `SearchProvider` also now accepts `initialCategory`/`initialLocation` props so a fresh page can seed its filters from the URL.
- `/salons` (`app/salons/page.tsx` → `salons-page-client.tsx`) reads `category`/`location` from `useSearchParams()` (wrapped in `<Suspense>`, required by Next.js for `useSearchParams`) and opens its own `SearchProvider` instance seeded from them. It reuses `SiteHeader`/`SiteFooter`/`SalonShowcase` — there is no shared client-side state between `/` and `/salons` beyond the URL query string; each page's `SearchProvider` is independent.
- `src/components/salon-card.tsx` was extracted from the old single-page `SalonShowcase` so both `/salons`'s full filterable grid and the landing page's `partner-showcase.tsx` (a small, non-filterable "trusted by these salons" credibility section, not connected to search state) render identical cards without duplicating markup.
- When composing a shadcn `Button` with `render={<Link .../>}` (Base UI), you must also pass `nativeButton={false}` — otherwise Base UI logs a console error because it expects its `render` target to be a real `<button>` unless told otherwise. See `partner-showcase.tsx`.

## Global chrome: language switcher, back-to-top

- The language switcher lives **only** in `SiteHeader` now (`LanguageSwitcher`) — `SiteFooter` no longer has one, by explicit request ("Sprachauswahl soll stets oben sein"). Don't re-add a `<select>`/locale control to the footer.
- `src/components/back-to-top.tsx` is mounted once, globally, in `app/layout.tsx` (not per-page) — a fixed bottom-right button that fades in past `window.scrollY > 640` and smooth-scrolls to top on click. It uses a plain `scroll` event listener + `useState`, not a Framer Motion scroll hook, since it needs a hard visibility threshold rather than a continuous transform.

## B2B onboarding, dashboards

- `/onboarding` (`onboarding-wizard.tsx`): 6-step wizard (path → business → treatments → SMS → calendar/team → review). The "auto-fetch" path simulates a Google-Places-style lookup with a `setTimeout` and derives fake business data from the entered URL — there is no real API call. Manual and auto paths converge on the same editable business-details form.
- `/dashboard` (`salon-dashboard.tsx`): tabbed salon-owner view (Overview stats, multi-staff calendar, team list, treatments management, SMS hub + log) — all mock state, all client-side.
- `/admin` (`admin-dashboard.tsx`): platform-wide stats + a salon audit table with working Approve/Suspend actions (local state only).
- The shared entry point is `auth-modal.tsx` (customer login/signup vs. salon-partner tabs, opened from the header's Anmelden/Salon-werden buttons) — the salon tab hands off to the full `/onboarding` page rather than trying to fit the whole wizard inside a modal.
- None of SMS sending, Google Places/website scraping, Google Calendar/Outlook OAuth, or payment/MRR data are real — every "connect"/"fetch"/"send" action is a UI-only simulation. Wiring up real integrations is a backend task, not a component change.

## Footer

Legal links (Impressum, Datenschutz, AGB), language selector (synced with the header's `LanguageSwitcher` via the same `useLocale()` context) and B2B link only. No third-party "built by" credit — explicitly declined for this project.

## Notes for future work

This Next.js version (16.x) differs from older training data — check `node_modules/next/dist/docs/` for current APIs before assuming behavior (route `LayoutProps<"/">`/`PageProps` helper types, etc. are already in use in `layout.tsx`).
