# henrybpan.com — Camel-Pack Accountability Home Base

**Date:** 2026-06-01
**Status:** Approved design, ready for planning
**Owner:** Henry Pan

---

## Overview

Rebuild `henrybpan.com` (the homepage) from a static link/landing page into a **public accountability home base** styled as a Camel Blue cigarette pack. It is simultaneously a funnel, a self-accountability dashboard, a consumption log, an idea-capture surface, and an entry point to the existing reels graph.

The guiding idea (Noah Zender, "Selfish Websites"): build for yourself first; the public utility follows. The site is radically transparent — Henry's commitments and streaks are shown in the open, and visitors can publicly pledge to hold him accountable.

This design **extends the existing "Sea of Fog, Printed" theme** (`/assets/theme.css`) rather than replacing it. The pack frame, stepped corners, Iqbal Camel wordmark, EST badge, cartouche nav, and blend band already exist and are reused.

## Goals

1. One link in the Instagram bio (`henrybpan.com`) that funnels viewers to **YouTube** (subscribe) and **Substack** (subscribe).
2. A **public accountability dashboard** for Henry's three commitments:
   - **1 devotional / day**
   - **1 video / week**
   - **1 essay / month**
3. A place to **log what he reads/watches** and his **reviews/thoughts**.
4. A **fast, no-markdown way to capture ideas** that renders as a public, you-only idea stream.
5. An entry to the existing **`/graph`** Instagram-reels mindmap (a separate content artifact — NOT the idea stream).

## Non-Goals

- No private/authenticated dashboard. Everything user-facing is public (the "Sivers bet").
- No invented marketing copy. Henry supplies all prose; the build leaves slots. (See [[feedback-no-placeholder-copy]].)
- No CMS/build framework. Stays static HTML/CSS/JS + small Python build scripts, deployed via GitHub Pages, plus one Cloudflare Worker for dynamic state.

## Aesthetic

Extends the current pack theme. Tokens already defined in `/assets/theme.css`: `--paper #ece8de`, `--ink #2c3a4d`, `--ember #c98968`, `--font-camel` (Iqbal Camel), `.pack-frame`, `.pack-corner`, `.est-badge`, `.cartouche`, `.cartouche-nav`, `.blend-band`.

**Dark "Black Series" variant (new).** Re-introduce a theme toggle: **light = Camel Blue (cream/ink)**, **dark = Black Series (near-black paper + gold ink/accent)**. Light is the default. The toggle and dark variables live in the shared `theme.css` + `theme.js`, so this technically applies sitewide; the homepage is verified first, other pages follow. Cache-bust `?v=N` must be bumped in lockstep across all themed pages (per `CLAUDE.md`).

**Centerpiece — engraved video plate.** The pack's central illustration is Henry's **latest YouTube video**, rendered at rest as a **duotone engraved plate**: grayscale + warm tint, halftone dot screen, printed inner frame, so it reads as part of the engraved pack rather than a glossy foreign rectangle. On click it lazy-loads and plays the real full-color embed. **No caption beneath the plate.**

## Page Structure — "Pack and a little"

The homepage pack is intentionally compact; deep content lives behind the cartouche menu.

**On the home pack (top → bottom):**
1. Cartouche top-bar nav (the menu).
2. Arched `HENRY PAN` wordmark (Iqbal Camel) + verse ("whatever you do, work at it with all your heart").
3. Engraved video plate (latest upload, click-to-play).
4. **Accountability scoreboard** — three cells: `1 Devo/Day`, `1 Video/Week`, `1 Essay/Month`, each showing the live streak/count and an on-track / due / missed status.
5. **Pledge block** — the cumulative pledge count + "Keep me accountable" button, tied visually to the current devotional streak.
6. **Latest devotional**, inline (the "little").
7. Blend band (`PHILOSOPHY & ECONOMICS BLEND` or Henry's chosen subtitle).

**Behind the cartouche menu (each its own page):**
- **Devotional** — full archive (built from markdown).
- **Reading & reviews** — consumption log + review pages (extends `/lindy-library`).
- **Ideas** — the public idea stream + Henry's gated quick-capture input.
- **Writing** — essays (existing `/essays`).
- **Graph** — `/graph` reels mindmap (existing).
- **About** — Henry's values/bio (Henry supplies copy).

## Components & Data Flow

### 1. Accountability scoreboard (client-computed)
- Build emits `dates.json`: `{ lastDevotional, devotionalDates[], lastVideo, lastEssay }`.
- Client JS computes, against **today's date**:
  - **Devotional streak** = consecutive days up to today with an entry; status `on-track` if today (or, grace, yesterday) posted, else `missed` (streak shown broken).
  - **Video** = posted within the current week → `on-track`; else days left / `due`.
  - **Essay** = posted within the current month → `on-track`/`done`; else `due`.
- Computing client-side means the page is **honest even on days Henry doesn't rebuild** — a missed day shows as broken without a deploy.

### 2. Pledge counter + "Keep me accountable" (Cloudflare Worker + KV)
- `GET /pledges` → current count.
- `POST /pledges` → increment, return new count. Basic dedupe: client sets `localStorage` flag so one browser counts once (best-effort, not anti-abuse-hard).
- On click: optimistic increment in UI → POST → then open **Substack subscribe** prompt (modal/embed or link).
- Count is **cumulative and never resets**; the devotional streak (client-computed) is what's shown "at stake" beside it.

### 3. Idea capture + stream (Cloudflare Worker + KV)
- `GET /ideas` → public list (newest first) `{ id, text, ts }`.
- `POST /ideas` → create; **gated** by a secret key sent in an `Authorization` header. Only Henry holds the key (stored in his browser `localStorage` after one-time entry). Visitors can read, never post.
- Ideas page fetches and renders live (no rebuild needed to see a new idea).
- This is distinct from `/graph` (reels). Ideas may later feed graph thinking, but are a separate store.

### 4. Engraved video plate (build + client)
- Build fetches the YouTube channel **RSS** (`https://www.youtube.com/feeds/videos.xml?channel_id=...`) and bakes the latest video id/title + `lastVideo` date.
- At rest: a static poster image (treated via CSS duotone + halftone + framed). On click: replace with the real `<iframe>` embed (lazy, perf-friendly).

### 5. Devotional pipeline (build)
- Henry drops a markdown file (from Obsidian) into a devotionals source folder.
- A Python build script (in `scripts/`, mirroring existing `build_graph_data.py` / `publish_graph.sh` patterns) renders each entry to a static page, builds the archive index, bakes the latest entry into the homepage, and updates `dates.json`.

## Backend Summary (Cloudflare Worker)

One Worker, two KV-backed resources:
- `pledges` (a single integer counter).
- `ideas` (a list/collection; POST gated by secret).

CORS allows `https://henrybpan.com`. Secret key stored as a Worker secret (server side) for validating idea POSTs. No secrets in the static site or repo.

## Copy Slots (Henry supplies)

- One-line mission / tagline.
- Blend-band subtitle (or keep `PHILOSOPHY & ECONOMICS BLEND`).
- About/values prose.
- Devotional entries (markdown).
- Idea text (typed live).

The build/UI never invents these — it renders neutral structure until Henry fills them.

## Phasing

**Phase 1 — Static (no backend).** Ships independently.
- Restructure homepage into the pack dashboard (nav, wordmark, engraved video plate, scoreboard, latest-devotional slot, blend band).
- Engraved video plate (CSS treatment + click-to-play + RSS bake).
- Scoreboard + client streak logic + `dates.json`.
- Devotional markdown pipeline + archive page.
- Reading & reviews page (extend lindy-library); About page.
- Re-introduce the Black Series dark toggle in `theme.css` / `theme.js`; bump `?v=N` sitewide.

**Phase 2 — Cloudflare Worker.**
- Pledge counter (GET/POST) wired to the button + Substack subscribe prompt.
- Idea capture (gated POST) + public idea stream page.

## Testing / Verification

- Static pages: verify in browser preview (light + Black Series dark), mobile + desktop widths, reduced-motion. Confirm the engraved plate reads as part of the pack and click-to-play loads the embed.
- Scoreboard: unit-test the streak/status date logic (consecutive days, week boundary, month boundary, missed-day → broken).
- Worker: test GET/POST for pledges (increment, dedupe flag) and ideas (public read, gated write rejects without key).
- Cross-page theme toggle: confirm persistence via `localStorage` and no flash-of-wrong-theme.

## Open Implementation Decisions

1. **Dark mode scope** — sitewide (recommended, consistent) vs. homepage-only. Re-adding to shared `theme.css` implies sitewide; verify homepage first, then sweep other pages.
2. **Worker storage** — KV (simple) vs. D1 (queryable) for ideas. Default KV unless idea volume/filtering grows.
3. **Pledge dedupe strength** — `localStorage` best-effort (default) vs. adding lightweight server-side throttling later.
4. **YouTube channel id** — confirm the exact channel id for the RSS bake.

## Related Memory

- [[feedback-no-placeholder-copy]] — leave copy slots empty; Henry writes the words.
