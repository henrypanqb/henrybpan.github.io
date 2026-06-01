# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static personal website for Henry Pan (henrybpan.com), deployed via GitHub Pages. No build system — all files are plain HTML/CSS/JS served directly.

## Deployment

Push to `main` → GitHub Pages auto-deploys. The custom domain `henrybpan.com` is configured via `CNAME`. The `.nojekyll` file disables Jekyll processing so GitHub Pages serves files as-is.

## Architecture

The site is a collection of standalone HTML files. Each page is self-contained with all *page-specific* CSS inlined in `<style>` tags and JS inlined in `<script>` tags. The **one exception** is the sitewide theme system, which is shared via `/assets/theme.css` + `/assets/theme.js` — see "Theming" below.

**Page structure:**
- `index.html` — Landing page (chester.how-style single-column scroll; hero + labeled section blocks routing to Director / Writing / Reading / Results / Text / About)
- `card/index.html` — The old flip business card, preserved as an easter egg. `noindex`. Linked from the homepage footer ("see the old card →"). Keeps its own cinematic dark aesthetic — does NOT participate in the sitewide light/dark theme.
- `director/index.html` — Paid offer page (DWY $750 / DFY $1,500). Has FAQ, testimonials grid, inverted final CTA block.
- `director/welcome/index.html` — Post-payment welcome page (GitHub username capture form). `noindex`.
- `text/index.html` — SMS list signup page.
- `community/index.html` — Two rooms (free Bible study + paid content review). `noindex` — hidden until deliverable is defined.
- `essays/index.html`, `lindy-library/index.html` — chester.how-inspired list pages (writing list, grouped reading list).
- `testimonies-results/index.html` — video testimonial grid. `noindex` — accessible via direct link from `/director` only, not listed in nav.
- `work-with-me/index.html` — Instant redirect to `/director` (`<meta http-equiv="refresh">` + JS `location.replace`). Not themed because it never renders for long.
- Legacy redirects: `essays.html`, `recommendations.html`, `work-with-me.html` may exist alongside the directory versions.

**Design system:**
- Typography: Cormorant Garamond (display/headings) + EB Garamond (body/UI) — loaded from Google Fonts. Consistent across every page.
- Palette driven by CSS custom properties in `/assets/theme.css`. See "Theming" below.
- Visual direction on post-redesign pages (everything except `/card`): generous whitespace, serif-only, em-dash-prefix section links, tracked-caps labels.
- The `/card` page keeps the original Bateman-inspired cinematic aesthetic — warm near-black `#1C0A06` bg with cream surface — that's intentional and must stay.

**Home page (`index.html`) — new layout:**
1. Anti-flash inline `<script>` at very top of `<head>` sets `data-theme` before first paint.
2. Floating `.theme-toggle` button (top-right, fixed position).
3. Hero: monogram watermark (absolute-positioned, low opacity, `filter: invert(1)` in dark mode), `h1.name`, italic tagline, 3-paragraph intro (with inline links — UVA → virginia.edu, "AI creative director" → /director, "read" → /lindy-library, "write" → /essays), two CTA buttons (`.btn-primary` "Install your AI creative director" → `/director`, `.btn-secondary` "Join my textletter" → `/text`).
4. 6 `.section` blocks, each with `.section-label` (tracked caps), `.section-link` (em-dash ::before pseudo-element), `.section-title`, `.section-blurb`.
5. Footer: social SVGs (IG/YT/X/email), copyright.

**Card page (`/card/index.html`) — preserved easter egg:**
- Verbatim copy of the pre-redesign homepage.
- Adds `<meta name="robots" content="noindex, nofollow">`.
- Adds small muted `← home` link top-left so it's not a dead end.
- Keeps its dark `#1C0A06` palette, flip-card UX, "see more" popup with scattered mini-cards.

## Theming (sitewide light + dark mode)

**Files (the only shared stylesheet + script in the repo):**
- `/assets/theme.css` — CSS custom properties for `[data-theme="light"]` and `[data-theme="dark"]`, plus the floating `.theme-toggle` button styles.
- `/assets/theme.js` — IIFE that wires `.theme-toggle` click handlers, writes to `localStorage['theme']`, and honors `prefers-color-scheme` only when no explicit preference exists.

**Why this breaks the "all CSS inlined per file" rule:** duplicating the theme variables + toggle styles across 9 pages would be unmaintainable. The exception is scoped to theming only. Page-specific CSS stays inlined per file.

**CSS variables (light / dark):**
- `--bg` — page bg (`#ffffff` / `#14130f`)
- `--bg-alt` — panel/card bg (`#faf8f2` / `#1c1a16`)
- `--fg` — primary text (`#1a1915` / `#ede8de`)
- `--fg-mut`, `--fg-dim`, `--fg-faint` — descending tiers of muted text
- `--border`, `--border-strong` — hairlines + emphasized borders

**Inverted blocks (e.g. `/director` `.final` CTA, `.offer-card.featured`):** use `background: var(--fg); color: var(--bg);` so the block inverts naturally in both themes without needing dark-mode-specific overrides.

**Anti-flash pattern (inlined at top of every themed page's `<head>`):**
```html
<script>(function(){try{var t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}}());</script>
```
This sets `data-theme` before first paint to prevent flash-of-wrong-theme on navigation.

**Toggle button markup** (placed directly after `<body>` on every themed page):
```html
<button type="button" class="theme-toggle" aria-label="Toggle light or dark mode">
  <svg class="icon-sun" ...>...</svg>
  <svg class="icon-moon" ...>...</svg>
</button>
```
Both SVGs live in the DOM and crossfade via `[data-theme]` selectors.

**Persistence:** `localStorage['theme']` (values: `"light"` or `"dark"`). Cleared by user clearing site data; otherwise sticky across sessions and navigations.

**Pages that do NOT include theming:**
- `/card` — intentional aesthetic moment.
- `/work-with-me` — instant redirect, never renders.

## Conventions

- Page-specific CSS lives in `<style>` blocks within each HTML file. Only `/assets/theme.*` is shared.
- Responsive sizing uses `clamp()` and `min()` — avoid fixed pixel values for layout dimensions.
- Font sizes on the card use `em` relative to the card's root `font-size` (set via `clamp()` on `.card-face`).
- `@media (prefers-reduced-motion: reduce)` blocks must be included when adding any animation.
- Social links use `target="_blank" rel="noopener noreferrer"` — maintain this on all external links.
- Favicon lives at `/favicon.png` (root) — all pages reference it as `<link rel="icon" type="image/png" href="/favicon.png">`.
- Open Graph + Twitter Card meta tags live only on `index.html`; preview image is `/preview.png`; canonical URL is `https://henrybpan.com/`.
- When adding a new themed page: include the anti-flash inline script + `<link rel="stylesheet" href="/assets/theme.css?v=N">` + `<script src="/assets/theme.js?v=N" defer></script>` + the `.theme-toggle` button markup, and use CSS variables (`var(--fg)` etc.) instead of hardcoded color literals. The `?v=N` query string busts the Cloudflare + browser cache whenever `theme.css` or `theme.js` changes — bump the number across all themed pages in lockstep whenever you edit either file (currently `v=2`).

## Accountability dashboard

The homepage (`index.html`) is a Camel-pack accountability dashboard.

**Publishing a devotional:** add `_devotionals/YYYY-MM-DD-slug.md` with frontmatter
`title:` + `date:` (YYYY-MM-DD), body in markdown. Then run
`cd scripts && python3 build_dashboard.py` (omit `--offline` to refresh the latest
YouTube video). Commit the new `devotionals/<slug>/` + `devotionals/index.html` +
`assets/data/dates.json`. Push → GitHub Pages deploys.

**Data flow:** the build writes `assets/data/dates.json`
(`devotionalDates`, `latestDevotional`, `latestVideo`, `lastVideo`, `lastEssay`).
`assets/home.js` fetches it and renders the scoreboard (via `assets/scoreboard.js`),
the engraved video plate (click-to-play), and the latest devotional. The scoreboard
streak/status is computed client-side from today's date, so a missed day shows as
broken without a rebuild.

**Commitments config:** `_commitments.json` holds `youtubeChannelId` and `lastEssay`
(bump `lastEssay` when a new essay ships so the monthly cell stays accurate).

**Tests:** `python3 -m pytest tests/test_dashboard_lib.py` and
`node --test test/scoreboard.test.mjs`.

## Testimonies & Results page

**File:** `testimonies-results/index.html`

- 2-column CSS grid of client cards (1-column on mobile ≤ 680px)
- Each card: circular profile photo (52px), `@username` linking to Instagram, IG/TikTok follower badges, HTML5 `<video>` testimonial
- Profile photos downloaded from Instagram and stored at `/testimonials/photos/{safe_username}.jpg` — safe name replaces `.` with `_` (e.g. `leogibson_mp4.jpg`)
- Testimonial videos live at `/testimonials/{username}_testimonial.MOV`
- `justtonch` card has no video (Instagram + TikTok stats only)
- Scraper script at `scripts/scrape_photos.py` — requires `playwright` + `playwright install chromium`; run once to refresh photos

**Client social data (hardcoded — update manually when counts change):**

| Username | Instagram | TikTok |
|---|---|---|
| seb.e.kho | 25.8k | — |
| rohabits | 101k | 65.6k |
| sheancreates | 10.3k | — |
| ericvwrld | 5.9k | — |
| lifeofdiegogabriel | 13.2k | — |
| leogibson.mp4 | 16.4k | 27.3k |
| jaqoea | 10k | 13.5k |
| justtonch | 17.5k | 28.2k |

## Card page popup cards (mini navigation — easter egg)

*Lives at `/card/index.html` — the preserved old flip-card homepage, no longer the site's landing page.*

- 5 mini business cards fly out from center on "more info" click: About, Essays, Recommendations, Work with Me, Results
- Scatter placement hits all four quadrants (lower-left, upper-right, upper-left, lower-right, top-center) — "cards tossed on a table" feel
- `homePos()` clamps all positions to viewport bounds (8px margin) — handles mobile safely
- Positions defined in `placements[]` array as `{ dx, dy, rot, delay }` — dx/dy are fractions of viewport

**Popup card structure:**
- Each card is a `<div class="popup-card">` wrapping an `<a class="popup-card-link">` — NOT a bare anchor
- `.popup-card-link` uses `position: absolute; inset: 25%` — only the center 50% of the card triggers navigation
- The outer `<div>` handles all drag events; cursor never changes during drag (no `grab`/`grabbing`)
- `is-dragging` class: disables transitions + scale(1.05) + elevated shadow + z-index bump — no cursor change
- Drag threshold is 6px before `hasMoved` is set; `hasMoved` reset deferred with `requestAnimationFrame`
- Navigation blocked via `click` listener on the inner `<a>` (not the card div) when `hasMoved` is true
- Both `pointerup` and `pointercancel` call the shared `endDrag` function
