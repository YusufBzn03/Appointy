@AGENTS.md

# Appointy — Landing Page

Booking platform for salons, barbers & beauty services (Planity-style utility, bespoke premium visual identity). Scope so far: marketing/discovery landing page only, no backend.

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
- Utility classes added on top of shadcn's defaults (`src/app/globals.css` `@layer utilities`): `.glass` / `.glass-panel` (frosted backdrop-blur surfaces), `.text-gradient` (headline gradient text), `.grain-overlay` (subtle SVG noise texture).
- Any section that should look like a dark SaaS panel regardless of site theme wraps itself in a `.dark` class div (see `partners-section.tsx`) rather than duplicating dark-mode colors.

## Animation architecture

- **Hero (`hero-section.tsx`)**: the only complex scroll-scrubbed sequence. Uses Framer Motion `useScroll({ target, offset: ["start start", "end end"] })` over a `h-[220vh]` section with a `sticky top-0 h-screen` inner container. Headline/search fade+lift out early (progress 0–0.3), the booking-preview mockup scales up, un-rotates and tightens its border radius (progress 0.12–0.62) to feel like it "locks" into place. All motion reads from the same `scrollYProgress` value — see the mapping comments if you extend it, and keep new transforms on that same timeline rather than adding independent scroll listeners.
- **Header (`site-header.tsx`)**: category shortcut row collapses (`opacity`/`height`) based on window `scrollY` via `useTransform`, not React state, to stay smooth.
- Everything else uses restrained, one-shot `whileInView` entrance animation (salon cards stagger slightly, partner revenue bars grow in) or `AnimatePresence` for discrete state changes (the 3-step booking demo in `customers-section.tsx`). Per the motion-hierarchy principle, secondary content does not scroll-scrub — only the hero does.
- `prefers-reduced-motion` is handled globally in `globals.css` (collapses transition/animation durations); the scroll-linked hero transforms still apply instantly rather than animating, since they're driven by scroll position, not a running animation loop.

## Mock data

All salons, categories, booking steps and B2B stats live in `src/lib/mock-data.ts`. No backend/API calls exist yet — swap this file for real data fetching when a backend lands.

## Footer

Legal links (Impressum, Datenschutz, AGB), language selector and B2B link only. No third-party "built by" credit — explicitly declined for this project.

## Notes for future work

This Next.js version (16.x) differs from older training data — check `node_modules/next/dist/docs/` for current APIs before assuming behavior (route `LayoutProps<"/">`/`PageProps` helper types, etc. are already in use in `layout.tsx`).
