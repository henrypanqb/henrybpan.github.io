# Minimalist site redesign — design spec

**Date:** 2026-06-14
**Author:** Henry Pan (with Claude)

## Goal

Replace the elaborate "Camel-pack accountability dashboard" front door with a
minimalist, text-first site in the spirit of **paulgraham.com**, **sive.rs**, and
**caseyneistat.com**: flat cream background, grey/black serif text, left-aligned,
no icons, no frame, no texture. Cormorant Garamond throughout.

Nothing is deleted. The existing site is preserved and stays reachable by direct
URL; the redesign is built *on top* and only swaps what the homepage links to.

## Aesthetic

- Background: flat cream `#ece8de` (same hue as today, but **no** paper-noise
  texture and **no** navy frame).
- Text: grey/near-black `#1c1c1c` primary, `#6b6b6b` muted/secondary.
- Type: Cormorant Garamond for everything (display + body). EB Garamond as
  fallback only.
- Layout: single left-aligned narrow column (~640px max), generous whitespace.
- Links: plain text, underlined on the body / unobtrusive in nav. **No icons
  anywhere** — YouTube/Instagram are plain word links.
- Subtle hover only (color shift). Respect `prefers-reduced-motion`.

## Stylesheet strategy

- New shared stylesheet **`/assets/minimal.css`** powers all redesigned pages.
- The existing **`/assets/theme.css?v=13`** is **never modified** — every archived
  / legacy page depends on it and must keep rendering exactly as-is.
- `minimal.css` defines its own CSS custom properties; it does not import or
  reference `theme.css`.

## Archive (non-destructive)

- Copy the current dashboard homepage to **`/archive/index.html`**, unchanged. It
  uses absolute `/assets/...` paths, so it keeps working against `theme.css?v=13`
  and `home.js`.
- All existing pages stay live and untouched: `/lindy-library`, `/essays`,
  `/devotionals`, `/director`, `/graph`, `/community`, `/text`, `/card`,
  `/testimonies-results`, etc. They are simply no longer linked from the new
  homepage.
- No files are removed in this change.

## Pages

### 1. `/` — homepage
- "Henry Pan" as a plain heading (Cormorant). No bio, no tagline (per Henry:
  "name only").
- Left-aligned text link list, in order:
  **Writings · Library · YouTube · Instagram · About · Contact**
- YouTube → `https://www.youtube.com/@henrybpan`
  Instagram → `https://www.instagram.com/henrybpan`
  (both `target="_blank" rel="noopener noreferrer"`, plain text, no icons).
- Writings → `/writings/`, Library → `/library/`, About → `/about/`,
  Contact → `/contact/`.

### 2. `/writings/` — own essays → Substack
- Plain list of Henry's essays, newest first, each linking to its Substack post.
- Real titles (already on the site): "how to make your first video",
  "why do people watch me?", "on burnout", "pursuing greatness".
- Substack root: `https://henrybpan.substack.com/`.
- **Input still needed from Henry:** the exact per-post Substack URL for each
  title. Until provided, each title links to the Substack root and is flagged in
  a code comment so it is easy to find and replace. No invented copy.

### 3. `/library/` — one page, three tiers
Top-to-bottom, clearly ranked:
1. **Lindy** — the best things ever read/watched. Sourced from the items already
   tagged `Lindy` in the existing `/lindy-library` page.
2. **Books & movies** — the rest of Henry's read/watched log (books, movies, TV,
   podcasts), reused verbatim from the existing `/lindy-library` data (titles +
   authors/creators already present, e.g. How to Win Friends, Antifragile,
   Confessions, The Godfather, The Last Dance, This is Water, Founders Podcast).
3. **Essays online** — good external reads (not life-changing).
   **Input still needed from Henry:** the list of essay links. Until provided,
   this tier renders an empty-but-labeled section with a code-comment marker; no
   placeholder/invented entries.
- Each entry: title + author/creator (and medium where it helps), plain text.
- Status tags from the old page (Reading / To read / Watched, etc.) are **not**
  carried over — the minimalist version is a clean recommendation list, not a
  tracker. (Open to revisiting if Henry wants statuses back.)

### 4. `/about/` and `/contact/` — restyled
- Re-skinned to `minimal.css`. Existing copy kept **verbatim** (about body text;
  contact methods/links). Camel-pack frame, cartouche nav, decorative SVGs, and
  `EST. MMVI` ornaments removed.
- Same left-aligned narrow column and link treatment as the rest of the redesign.
- A small "← Henry Pan" / home link at top so they are not dead ends.

## Out of scope

- No changes to `/director`, `/devotionals`, `/graph`, dashboard build scripts,
  `home.js`, `scoreboard.js`, or `theme.css`.
- No dark mode (site is light-only already).
- No new build tooling — plain static HTML/CSS, consistent with the repo.

## Open inputs (Henry to provide; will not be invented)

1. Per-post Substack URLs for the four Writings titles.
2. The "essays online" link list for the Library page's third tier.

## Testing / verification

- Manual: serve locally, load `/`, `/writings/`, `/library/`, `/about/`,
  `/contact/`, and confirm: correct links, cream `#ece8de` background, grey/black
  Cormorant text, left-aligned, no icons, no frame.
- Confirm `/archive/index.html` still renders the old dashboard identically
  (theme.css untouched).
- Confirm all legacy pages still load by direct URL.
- Existing automated tests (`pytest tests/`, `node --test test/`) must still pass
  — this change does not touch the code they cover, but run them to confirm.
