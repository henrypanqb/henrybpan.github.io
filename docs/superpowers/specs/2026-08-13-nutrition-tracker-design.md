# Nutrition Tracker ("FiveCode") — Design Spec

**Date:** 2026-08-13
**Status:** Approved design, pre-implementation
**Owner:** Henry Pan (single-user)

## 1. Summary

A private, phone-first nutrition app living at `henrybpan.com/nutrition/`. It is a digital,
editable version of Henry's meal-plan spreadsheet: a **food library** (foods with
per-serving macros, grouped by Protein / Fat / Carb) plus a **multi-day plan builder**
(days → meals → items, where each item is `food × servings`) with **live per-meal /
per-day macro totals versus daily targets**. A **daily log** (diary) records what was
actually eaten, with an "apply a plan day to today" shortcut.

Single user (Henry), synced across devices via Supabase. `noindex`, direct-link only.

## 2. Goals / Non-goals

**Goals**
- Recreate the spreadsheet's core value on a phone: build plans, see macros vs targets live.
- Persist and sync data across devices (Supabase).
- Seed the food library from the existing spreadsheet; allow adding/editing custom foods.
- Log actual daily intake against targets; prefill from a plan day.

**Non-goals (for now)**
- Multi-user / public sign-up. Single user only.
- Barcode scanning, third-party nutrition APIs.
- Training/cardio schedule + HIIT ratio (parked for Phase 3).
- A build system / bundler. The app ships as plain files, per repo convention.

## 3. Architecture

- **Front end:** Vue 3 loaded via CDN — **no build step**. Reactive `computed` properties
  drive the live macro aggregation.
- **Backend:** Supabase (Postgres + Auth). Project ref `hpupzuzyxjkbbaupjcib`
  → `https://hpupzuzyxjkbbaupjcib.supabase.co`. Accessed from the browser via the
  Supabase JS client (CDN) using the **public anon key**, protected by RLS.
- **Hosting:** GitHub Pages (existing static site), deploys on `git push` to `main`.

### File layout (`/nutrition/`)
- `index.html` — app shell: loads Vue 3, Supabase JS, `/assets/theme.css`, app modules.
- `app.js` — Vue root + hash-based routing between views.
- `supabase.js` — client init + public config (URL + anon key).
- `store.js` — reactive state + all DB reads/writes (single place that talks to Supabase).
- `calc.js` — **pure functions** for macro math (item → meal → day → vs target). No DOM/network.
- `foods-seed.js` — ~150 foods from the spreadsheet, for one-time DB seeding.
- Views implemented as Vue component objects (many small focused files under `views/`).

Loaded as ES modules (`<script type="module">`), served as-is by GitHub Pages.

## 4. Data model (Supabase / Postgres)

All tables carry `user_id` and are protected by RLS (`user_id = auth.uid()`).

**`foods`** — library
`id, user_id, name, category (protein|fat|carb), serving_label (text, e.g. "200g", "2 eggs"),
calories, protein, fat, carb (numeric, per standard serving), is_custom (bool), created_at`.

**`plans`** — reusable templates
`id, user_id, name, notes, target_calories, target_protein, target_fat, target_carb, created_at`.

**`plan_days`**
`id, plan_id, day_index (int), label (text),
target_calories, target_protein, target_fat, target_carb (nullable → inherit plan defaults)`.

**`meals`**
`id, day_id, position (int), name (text, e.g. "Meal 1", "Add-On")`. Add/remove-able; not fixed at 6.

**`meal_items`** — plan line items (live/editable)
`id, meal_id, position (int), food_id (fk → foods), servings (numeric, fractional OK)`.
Macros are computed live by joining to `foods` × `servings`; editing a food updates plans that use it.

**`log_days`** — daily diary header (Phase 2)
`id, user_id, date, target_calories, target_protein, target_fat, target_carb`.

**`log_entries`** — diary line items (frozen snapshots, Phase 2)
`id, log_day_id, meal_name (text), food_id (nullable), food_name (text snapshot),
servings (numeric), calories, protein, fat, carb (numeric snapshots)`.

**Key modeling decision:** plan items are *live* (a template that re-derives macros from
`foods`); log entries are *frozen* (a historical record that snapshots macros at log time,
so history stays accurate even if a food is later edited or deleted).

## 5. Auth & security

- **Login:** Supabase Auth **magic link** (email). Session persists in localStorage.
- **RLS:** every table policy is `user_id = auth.uid()`. Seed foods owned by Henry's user_id.
  Unauthenticated visitors see/write nothing.
- **Secrets:** only the public anon key ships in the static page (safe under RLS).
  The service-role key never touches the front end and is never committed.

## 6. Views & UX

Four views, bottom tab bar (thumb-friendly). Reuses `/assets/theme.css` variables + light/dark
toggle. Numbers use a tabular/system font for legibility; Garamond stays for headings/labels.

1. **Today (daily log — default view):** date header, target progress bars (green at target),
   meals with items, per-meal totals, "Apply a plan day" prefill. Tap a meal to add/edit items.
2. **Plans:** list of plan templates → open → day tabs (Day 1…5) → meals → items, with the same
   live per-meal / per-day totals-vs-target readout. The editable spreadsheet.
3. **Library:** search + list grouped by Protein / Fat / Carb, macros per serving.
   "+ Add food" for custom entries; tap to edit.
4. **Settings:** default daily targets, theme, sign out. (Training schedule parked for Phase 3.)

**Food picker** (shared by Today + Plans): search → pick food → enter # servings
(fraction-friendly stepper) → live macro preview → add.

## 7. Phasing

- **Phase 1 — MVP:** Auth + Library (seed + custom) + Plans (day tabs, meals, items, live macros
  vs targets) + Settings. Deployable and useful on its own.
- **Phase 2 — Daily log:** Today view, snapshotted entries, "apply a plan day to today."
- **Phase 3 — nice-to-haves:** training/cardio schedule, shopping list from a plan, PWA install,
  export. Optional.

## 8. Testing

- **`calc.js`** (critical macro-aggregation logic): pure functions, **unit-tested first (TDD)**
  with `node --test` (built into Node, no build tooling). Target 80%+ coverage on this module.
- **Playwright smoke tests** for the critical flow: sign in → add item to a plan → totals update.
  Uses the repo's existing `tests/` dir / Playwright convention.
- **`store.js` / Supabase:** kept thin; validated via smoke tests + manual checks against the
  real project.

## 9. Discoverability

`noindex`, not linked from any page. Reached via `henrybpan.com/nutrition` bookmark. Most private.

## 10. Open items to resolve at implementation time

- Obtain the Supabase **anon key** (via Supabase MCP once connected, or from the dashboard).
- Confirm the Supabase MCP server is connected/authenticated in the session before wiring the DB.
- Exact seed extraction from the spreadsheet's "Lists" sheet into `foods-seed.js`.
