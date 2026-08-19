# Nutrition Tracker — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a phone-first, single-user meal-plan builder at `henrybpan.com/nutrition/` — a seedable food library plus editable multi-day plans with live macro totals vs targets, synced via Supabase.

**Architecture:** Vue 3 loaded from CDN (no build step) as ES modules under `/nutrition/`. Pure macro math lives in `calc.js` (unit-tested first with `node --test`). Supabase (Postgres + magic-link Auth + RLS) is the backend, reached from the browser via the public anon key. Deploys on `git push` to `main` via GitHub Pages.

**Tech Stack:** Vue 3 (global CDN build), `@supabase/supabase-js` (CDN ESM), Postgres/Supabase, `node --test` for unit tests, Playwright for one smoke test. Reuses `/assets/theme.css`.

**Scope:** Phase 1 = Auth + Library (seed + custom) + Plans (days → meals → items, live totals vs targets) + Settings. Phase 2 (daily log) and Phase 3 (training schedule, PWA, etc.) are separate plans.

**Spec:** `docs/superpowers/specs/2026-08-13-nutrition-tracker-design.md`

**Prerequisite:** The Supabase MCP server must be connected/authenticated in the session before Task 2 (schema) and Task 4 (anon key). Tasks 1 and 3 have no such dependency and can start immediately.

---

## File Structure

```
nutrition/
  index.html          # app shell: loads Vue, Supabase, theme.css, app.js
  app.js              # Vue root, hash routing, mounts views, auth gate
  config.js           # public Supabase URL + anon key
  supabase.js         # Supabase client init (imports config)
  store.js            # reactive state + all DB reads/writes
  calc.js             # PURE macro math (no DOM/network) — TDD core
  foods-seed.js       # ~150 foods from the spreadsheet Lists sheet
  views/
    library.js        # Library view component
    plans.js          # Plans list view component
    plan-detail.js    # Plan editor: day tabs, meals, items, totals
    settings.js       # targets, theme, sign out
    food-picker.js    # shared modal: search food + servings + preview
  styles.css          # app-specific styles (tab bar, tables, progress bars)
tests/
  nutrition/
    calc.test.mjs     # node --test unit tests for calc.js
    smoke.spec.js     # Playwright smoke test
scripts/
  seed-nutrition.mjs  # one-time DB seed runner (service role, local only)
supabase/
  nutrition-schema.sql # tables + RLS (applied via MCP or dashboard)
```

---

## Task 1: Scaffold the app shell and routing

**Files:**
- Create: `nutrition/index.html`
- Create: `nutrition/app.js`
- Create: `nutrition/styles.css`

- [ ] **Step 1: Create the shell `nutrition/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex, nofollow" />
  <title>FiveCode</title>
  <link rel="icon" href="/favicon.png" />
  <link rel="stylesheet" href="/assets/theme.css" />
  <link rel="stylesheet" href="/nutrition/styles.css" />
  <script>(function(){try{var t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}}());</script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/nutrition/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create a minimal `nutrition/app.js` with hash routing**

```js
const { createApp, reactive, computed, h } = Vue;

const route = reactive({ path: location.hash.slice(1) || '/plans' });
window.addEventListener('hashchange', () => { route.path = location.hash.slice(1) || '/plans'; });

const App = {
  setup() {
    const tabs = [
      { path: '/today', label: 'Today' },
      { path: '/plans', label: 'Plans' },
      { path: '/library', label: 'Library' },
      { path: '/settings', label: 'Settings' },
    ];
    const active = computed(() => route.path);
    return () => h('div', { class: 'app' }, [
      h('main', { class: 'view' }, `Route: ${active.value}`),
      h('nav', { class: 'tabbar' }, tabs.map(t =>
        h('a', { href: '#' + t.path, class: ['tab', active.value.startsWith(t.path) ? 'is-active' : ''] }, t.label)
      )),
    ]);
  },
};

createApp(App).mount('#app');
```

- [ ] **Step 3: Create `nutrition/styles.css` with the tab bar + layout base**

```css
:root { --tabbar-h: 56px; }
.app { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); color: var(--fg); }
.view { flex: 1; padding: 16px 16px calc(var(--tabbar-h) + 16px); max-width: 640px; margin: 0 auto; width: 100%; box-sizing: border-box; }
.tabbar { position: fixed; bottom: 0; left: 0; right: 0; height: var(--tabbar-h);
  display: grid; grid-template-columns: repeat(4, 1fr); background: var(--bg-alt);
  border-top: 1px solid var(--border); padding-bottom: env(safe-area-inset-bottom); }
.tab { display: flex; align-items: center; justify-content: center; text-decoration: none;
  color: var(--fg-mut); font: 500 13px system-ui, sans-serif; }
.tab.is-active { color: var(--fg); }
.num { font-variant-numeric: tabular-nums; font-family: system-ui, sans-serif; }
```

- [ ] **Step 4: Verify locally**

Run: `cd /Users/henrypan/Desktop/henrybpan.github.io && python3 -m http.server 8000`
Open `http://localhost:8000/nutrition/` — expect the tab bar at the bottom and "Route: /plans". Tapping tabs changes the route text.

- [ ] **Step 5: Commit**

```bash
git add nutrition/index.html nutrition/app.js nutrition/styles.css
git commit -m "feat(nutrition): scaffold app shell, hash routing, tab bar"
```

---

## Task 2: Supabase schema + RLS

**Files:**
- Create: `supabase/nutrition-schema.sql`

**Prerequisite:** Supabase MCP connected. Apply the SQL via the MCP `apply_migration`/`execute_sql` tool (or paste into the dashboard SQL editor).

- [ ] **Step 1: Write `supabase/nutrition-schema.sql`**

```sql
-- Foods library
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  category text not null check (category in ('protein','fat','carb')),
  serving_label text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  carb numeric not null default 0,
  is_custom boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  notes text,
  target_calories numeric, target_protein numeric, target_fat numeric, target_carb numeric,
  created_at timestamptz not null default now()
);

create table if not exists plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  day_index int not null,
  label text not null,
  target_calories numeric, target_protein numeric, target_fat numeric, target_carb numeric
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references plan_days(id) on delete cascade,
  position int not null default 0,
  name text not null
);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  position int not null default 0,
  food_id uuid not null references foods(id) on delete restrict,
  servings numeric not null default 1
);

-- RLS: single-user isolation
alter table foods enable row level security;
alter table plans enable row level security;
alter table plan_days enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;

create policy "own foods" on foods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own plans" on plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own plan_days" on plan_days for all
  using (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "own meals" on meals for all
  using (exists (select 1 from plan_days d join plans p on p.id = d.plan_id where d.id = day_id and p.user_id = auth.uid()))
  with check (exists (select 1 from plan_days d join plans p on p.id = d.plan_id where d.id = day_id and p.user_id = auth.uid()));
create policy "own meal_items" on meal_items for all
  using (exists (select 1 from meals m join plan_days d on d.id = m.day_id join plans p on p.id = d.plan_id where m.id = meal_id and p.user_id = auth.uid()))
  with check (exists (select 1 from meals m join plan_days d on d.id = m.day_id join plans p on p.id = d.plan_id where m.id = meal_id and p.user_id = auth.uid()));
```

- [ ] **Step 2: Apply the migration**

Via Supabase MCP: call the migration/execute-SQL tool with the file contents, named `nutrition_schema`.
Expected: success; `list_tables` now shows `foods, plans, plan_days, meals, meal_items`.

- [ ] **Step 3: Verify RLS is on**

Via MCP `execute_sql`: `select relname, relrowsecurity from pg_class where relname in ('foods','plans','plan_days','meals','meal_items');`
Expected: `relrowsecurity = true` for all five.

- [ ] **Step 4: Commit**

```bash
git add supabase/nutrition-schema.sql
git commit -m "feat(nutrition): supabase schema + RLS policies"
```

---

## Task 3: calc.js pure macro math (TDD)

**Files:**
- Create: `tests/nutrition/calc.test.mjs`
- Create: `nutrition/calc.js`

- [ ] **Step 1: Write the failing tests `tests/nutrition/calc.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemMacros, sumMacros, EMPTY, vsTarget } from '../../nutrition/calc.js';

const food = { calories: 200, protein: 18, fat: 10, carb: 10 };

test('itemMacros scales a food by servings', () => {
  assert.deepEqual(itemMacros(food, 0.75), { calories: 150, protein: 13.5, fat: 7.5, carb: 7.5 });
});

test('itemMacros of a missing food is zero', () => {
  assert.deepEqual(itemMacros(null, 3), EMPTY);
});

test('sumMacros adds a list of macro objects', () => {
  const total = sumMacros([
    { calories: 150, protein: 13.5, fat: 7.5, carb: 7.5 },
    { calories: 33, protein: 0, fat: 0, carb: 8.2 },
  ]);
  assert.deepEqual(total, { calories: 183, protein: 13.5, fat: 7.5, carb: 15.7 });
});

test('sumMacros of empty list is EMPTY', () => {
  assert.deepEqual(sumMacros([]), EMPTY);
});

test('vsTarget reports actual, target, pct and met', () => {
  const r = vsTarget({ calories: 3150, protein: 135, fat: 105, carb: 306 },
                     { calories: 3150, protein: 135, fat: 105, carb: 306 });
  assert.equal(r.calories.pct, 100);
  assert.equal(r.protein.met, true);
});

test('vsTarget handles a null target as pct 0, not met', () => {
  const r = vsTarget({ calories: 500, protein: 0, fat: 0, carb: 0 }, null);
  assert.equal(r.calories.pct, 0);
  assert.equal(r.calories.met, false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/nutrition/calc.test.mjs`
Expected: FAIL — `Cannot find module '.../nutrition/calc.js'`.

- [ ] **Step 3: Implement `nutrition/calc.js`**

```js
export const EMPTY = { calories: 0, protein: 0, fat: 0, carb: 0 };
const KEYS = ['calories', 'protein', 'fat', 'carb'];
const round = (n) => Math.round(n * 100) / 100;

export function itemMacros(food, servings) {
  if (!food) return { ...EMPTY };
  const s = Number(servings) || 0;
  const out = {};
  for (const k of KEYS) out[k] = round((Number(food[k]) || 0) * s);
  return out;
}

export function sumMacros(list) {
  const out = { ...EMPTY };
  for (const m of list) for (const k of KEYS) out[k] = round(out[k] + (Number(m[k]) || 0));
  return out;
}

export function vsTarget(actual, target) {
  const out = {};
  for (const k of KEYS) {
    const a = Number(actual?.[k]) || 0;
    const t = target ? Number(target[k]) || 0 : 0;
    const pct = t > 0 ? Math.round((a / t) * 100) : 0;
    out[k] = { actual: a, target: t, pct, met: t > 0 && a >= t };
  }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/nutrition/calc.test.mjs`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add nutrition/calc.js tests/nutrition/calc.test.mjs
git commit -m "feat(nutrition): pure macro math with unit tests"
```

---

## Task 4: Supabase client + config

**Files:**
- Create: `nutrition/config.js`
- Create: `nutrition/supabase.js`

**Prerequisite:** Supabase MCP connected — fetch the anon key via the MCP `get_anon_key`/project-settings tool, or the dashboard (Project Settings → API).

- [ ] **Step 1: Create `nutrition/config.js` with the public config**

```js
// Public values — safe to ship. Data is protected by RLS.
export const SUPABASE_URL = 'https://hpupzuzyxjkbbaupjcib.supabase.co';
export const SUPABASE_ANON_KEY = 'REPLACE_WITH_ANON_KEY';
```

- [ ] **Step 2: Fetch and paste the real anon key**

Via Supabase MCP: get the project's anon (publishable) key and replace `REPLACE_WITH_ANON_KEY`.
Verify it starts with `eyJ` (a JWT) or the new `sb_publishable_` prefix.

- [ ] **Step 3: Create `nutrition/supabase.js`**

```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
```

- [ ] **Step 4: Verify the client loads**

Add a temporary check in the browser console at `http://localhost:8000/nutrition/`:
`import('/nutrition/supabase.js').then(m => console.log(!!m.supabase))` → expect `true`, no network errors.

- [ ] **Step 5: Commit**

```bash
git add nutrition/config.js nutrition/supabase.js
git commit -m "feat(nutrition): supabase client + public config"
```

---

## Task 5: Auth gate (magic link)

**Files:**
- Modify: `nutrition/app.js`
- Create: `nutrition/store.js`

- [ ] **Step 1: Create `nutrition/store.js` with session state + auth actions**

```js
const { reactive } = Vue;
import { supabase } from './supabase.js';

export const state = reactive({ session: null, ready: false });

export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  state.ready = true;
  supabase.auth.onAuthStateChange((_e, session) => { state.session = session; });
}

export async function signIn(email) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + '/nutrition/' },
  });
}

export async function signOut() { await supabase.auth.signOut(); }
```

- [ ] **Step 2: Add an auth gate + sign-in form to `nutrition/app.js`**

Replace the `App` component's `setup` return with a gate that renders a sign-in form when `!state.session`, otherwise the routed view. Add at top: `import { state, initAuth, signIn } from './store.js';` and call `initAuth()` before `createApp`.

```js
const SignIn = {
  setup() {
    const email = Vue.ref('');
    const sent = Vue.ref(false);
    const err = Vue.ref('');
    const submit = async () => {
      err.value = '';
      const { error } = await signIn(email.value.trim());
      if (error) err.value = error.message; else sent.value = true;
    };
    return () => h('div', { class: 'signin' }, sent.value
      ? [h('p', 'Check your email for a sign-in link.')]
      : [
          h('h1', 'FiveCode'),
          h('input', { type: 'email', placeholder: 'you@email.com',
            value: email.value, onInput: e => email.value = e.target.value }),
          h('button', { onClick: submit }, 'Send magic link'),
          err.value ? h('p', { class: 'err' }, err.value) : null,
        ]);
  },
};
```

In `App.setup`, gate the render:
```js
if (!state.ready) return () => h('div', { class: 'view' }, 'Loading…');
if (!state.session) return () => h(SignIn);
// else render tab bar + routed view (as before)
```

Bootstrap:
```js
await initAuth();
createApp(App).mount('#app');
```
(Wrap the mount in a top-level `async` IIFE since `app.js` is a module.)

- [ ] **Step 3: Add sign-in styles to `nutrition/styles.css`**

```css
.signin { max-width: 360px; margin: 20vh auto; display: grid; gap: 12px; padding: 0 16px; text-align: center; }
.signin input { padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-alt); color: var(--fg); font-size: 16px; }
.signin button { padding: 12px; border: 0; border-radius: 8px; background: var(--fg); color: var(--bg); font-size: 16px; }
.err { color: #c0392b; font-size: 14px; }
```

- [ ] **Step 4: Verify the magic-link flow**

At `http://localhost:8000/nutrition/`: enter your email → "Send magic link" → "Check your email" message. Click the emailed link → returns authenticated; tab bar + views render.
(Ensure `http://localhost:8000/nutrition/` and the production URL are added as Supabase Auth redirect URLs in the dashboard / via MCP.)

- [ ] **Step 5: Commit**

```bash
git add nutrition/app.js nutrition/store.js nutrition/styles.css
git commit -m "feat(nutrition): magic-link auth gate"
```

---

## Task 6: Food library — seed data + view

**Files:**
- Create: `nutrition/foods-seed.js`
- Create: `scripts/seed-nutrition.mjs`
- Modify: `nutrition/store.js`
- Create: `nutrition/views/library.js`
- Modify: `nutrition/app.js` (route → library view)

- [ ] **Step 1: Generate `nutrition/foods-seed.js` from the spreadsheet**

Extract the "Lists" sheet into an array. Shape per row:
```js
export const FOODS_SEED = [
  { name: 'Total Full Fat Greek Yoghurt', category: 'protein', serving_label: '200g', calories: 202, protein: 18, fat: 10, carb: 10 },
  { name: 'Peanut Butter (WEIGHED)', category: 'fat', serving_label: '15g', calories: 94, protein: 3.8, fat: 7.7, carb: 2.1 },
  { name: 'White Pasta (RAW)', category: 'carb', serving_label: '75g dry', calories: 262, protein: 9, fat: 1.1, carb: 54 },
  // …all Protein/Fat/Carb rows from the Lists sheet, is_custom defaults false at seed time
];
```
Produce it by re-reading the xlsx `Lists` sheet (three column-groups: Protein Options, Fat Options, Carbohydrate Options), skipping "No … Source" placeholder rows.

- [ ] **Step 2: Write `scripts/seed-nutrition.mjs` (one-time, local, service role)**

```js
import { createClient } from '@supabase/supabase-js';
import { FOODS_SEED } from '../nutrition/foods-seed.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // local env only, never committed
const userId = process.env.SEED_USER_ID;           // Henry's auth.users id
const db = createClient(url, key);

const rows = FOODS_SEED.map(f => ({ ...f, is_custom: false, user_id: userId }));
const { error, count } = await db.from('foods').insert(rows, { count: 'exact' });
if (error) { console.error(error); process.exit(1); }
console.log('Seeded', count, 'foods');
```

Run once after you have signed in (to get `SEED_USER_ID` from the dashboard / MCP):
`SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SEED_USER_ID=… node scripts/seed-nutrition.mjs`
Expected: "Seeded N foods".

- [ ] **Step 3: Add foods data access to `nutrition/store.js`**

```js
export const data = reactive({ foods: [] });

export async function loadFoods() {
  const { data: rows, error } = await supabase.from('foods').select('*').order('category').order('name');
  if (!error) data.foods = rows;
  return { error };
}

export async function addFood(food) {
  const { data: row, error } = await supabase.from('foods').insert(food).select().single();
  if (!error) data.foods.push(row);
  return { row, error };
}

export async function updateFood(id, patch) {
  const { data: row, error } = await supabase.from('foods').update(patch).eq('id', id).select().single();
  if (!error) { const i = data.foods.findIndex(f => f.id === id); if (i >= 0) data.foods[i] = row; }
  return { row, error };
}
```
(Add `data` to the existing imports/exports; `reactive` already imported.)

- [ ] **Step 4: Create `nutrition/views/library.js`**

```js
const { computed, ref, h } = Vue;
import { data, loadFoods, addFood } from '../store.js';

export const Library = {
  setup() {
    const q = ref('');
    const CATS = ['protein', 'fat', 'carb'];
    loadFoods();
    const filtered = computed(() => {
      const term = q.value.toLowerCase();
      return CATS.map(cat => ({
        cat,
        items: data.foods.filter(f => f.category === cat && f.name.toLowerCase().includes(term)),
      }));
    });
    const draft = ref(null);
    const startAdd = () => draft.value = { name: '', category: 'protein', serving_label: '', calories: 0, protein: 0, fat: 0, carb: 0 };
    const save = async () => { const { error } = await addFood(draft.value); if (!error) draft.value = null; };

    return () => h('div', {}, [
      h('input', { class: 'search', placeholder: 'Search foods', value: q.value, onInput: e => q.value = e.target.value }),
      h('button', { class: 'add-btn', onClick: startAdd }, '+ Add food'),
      draft.value ? foodForm(draft, save) : null,
      ...filtered.value.map(group => h('section', {}, [
        h('h2', { class: 'cat' }, group.cat),
        h('ul', { class: 'food-list' }, group.items.map(f =>
          h('li', {}, [
            h('span', { class: 'food-name' }, `${f.name} · ${f.serving_label}`),
            h('span', { class: 'num' }, `${f.calories} cal · P${f.protein} F${f.fat} C${f.carb}`),
          ]))),
      ])),
    ]);
  },
};

function foodForm(draft, save) {
  const field = (k, type = 'number') => h('input', { type, placeholder: k, value: draft.value[k],
    onInput: e => draft.value[k] = type === 'number' ? Number(e.target.value) : e.target.value });
  return h('div', { class: 'food-form' }, [
    field('name', 'text'),
    h('select', { value: draft.value.category, onChange: e => draft.value.category = e.target.value },
      ['protein','fat','carb'].map(c => h('option', { value: c }, c))),
    field('serving_label', 'text'),
    field('calories'), field('protein'), field('fat'), field('carb'),
    h('button', { onClick: save }, 'Save'),
  ]);
}
```

- [ ] **Step 5: Wire the route in `nutrition/app.js`**

Import `{ Library } from './views/library.js'` and render it when `route.path.startsWith('/library')` (replace the placeholder text for that route with `h(Library)`).

- [ ] **Step 6: Add library styles to `nutrition/styles.css`**

```css
.search { width: 100%; padding: 10px; margin-bottom: 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-alt); color: var(--fg); font-size: 16px; box-sizing: border-box; }
.add-btn { margin-bottom: 12px; background: none; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; color: var(--fg); }
.cat { text-transform: uppercase; letter-spacing: .08em; font: 600 12px system-ui; color: var(--fg-mut); margin: 16px 0 6px; }
.food-list { list-style: none; padding: 0; margin: 0; }
.food-list li { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.food-form { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; }
```

- [ ] **Step 7: Verify**

At `/nutrition/#/library`: seeded foods appear grouped by category; search filters; "+ Add food" saves a custom food that then appears in its group and survives reload.

- [ ] **Step 8: Commit**

```bash
git add nutrition/foods-seed.js scripts/seed-nutrition.mjs nutrition/store.js nutrition/views/library.js nutrition/app.js nutrition/styles.css
git commit -m "feat(nutrition): food library seed, data layer, and view"
```

---

## Task 7: Plans list — create/list plans

**Files:**
- Modify: `nutrition/store.js`
- Create: `nutrition/views/plans.js`
- Modify: `nutrition/app.js`

- [ ] **Step 1: Add plan data access to `nutrition/store.js`**

```js
export async function loadPlans() {
  const { data: rows, error } = await supabase.from('plans').select('*').order('created_at');
  if (!error) data.plans = rows;
  return { error };
}

export async function createPlan(name) {
  const { data: plan, error } = await supabase.from('plans')
    .insert({ name, target_calories: 3150, target_protein: 135, target_fat: 105, target_carb: 306 })
    .select().single();
  if (error) return { error };
  const { data: day } = await supabase.from('plan_days')
    .insert({ plan_id: plan.id, day_index: 1, label: 'Day 1' }).select().single();
  await supabase.from('meals').insert(
    [1,2,3].map(n => ({ day_id: day.id, position: n, name: 'Meal ' + n }))
  );
  data.plans.push(plan);
  return { plan };
}
```
(Add `plans: []` to the `data` reactive object.)

- [ ] **Step 2: Create `nutrition/views/plans.js`**

```js
const { ref, h } = Vue;
import { data, loadPlans, createPlan } from '../store.js';

export const Plans = {
  setup() {
    const name = ref('');
    loadPlans();
    const add = async () => { if (!name.value.trim()) return; await createPlan(name.value.trim()); name.value = ''; };
    return () => h('div', {}, [
      h('h1', 'Plans'),
      h('div', { class: 'new-plan' }, [
        h('input', { placeholder: 'New plan name', value: name.value, onInput: e => name.value = e.target.value }),
        h('button', { onClick: add }, 'Create'),
      ]),
      h('ul', { class: 'plan-list' }, data.plans.map(p =>
        h('li', {}, h('a', { href: `#/plans/${p.id}` }, p.name)))),
    ]);
  },
};
```

- [ ] **Step 3: Wire the route + detail route parsing in `nutrition/app.js`**

Import `{ Plans }`. When `route.path === '/plans'` render `h(Plans)`. When `route.path` matches `/plans/:id`, render the plan detail (Task 8). Add a helper:
```js
const planId = computed(() => (route.path.match(/^\/plans\/(.+)$/) || [])[1]);
```

- [ ] **Step 4: Verify**

At `/nutrition/#/plans`: create a plan → it appears in the list and links to `#/plans/<id>`. Reload → persists.

- [ ] **Step 5: Commit**

```bash
git add nutrition/store.js nutrition/views/plans.js nutrition/app.js
git commit -m "feat(nutrition): plans list + create"
```

---

## Task 8: Plan detail — days, meals, items, live totals

**Files:**
- Modify: `nutrition/store.js`
- Create: `nutrition/views/food-picker.js`
- Create: `nutrition/views/plan-detail.js`
- Modify: `nutrition/app.js`, `nutrition/styles.css`

- [ ] **Step 1: Add plan-detail data access to `nutrition/store.js`**

```js
export async function loadPlan(planId) {
  const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();
  const { data: days } = await supabase.from('plan_days').select('*').eq('plan_id', planId).order('day_index');
  const dayIds = days.map(d => d.id);
  const { data: meals } = await supabase.from('meals').select('*').in('day_id', dayIds).order('position');
  const mealIds = meals.map(m => m.id);
  const { data: items } = mealIds.length
    ? await supabase.from('meal_items').select('*').in('meal_id', mealIds).order('position')
    : { data: [] };
  return { plan, days, meals, items };
}

export async function addItem(mealId, foodId, servings) {
  const { data: row, error } = await supabase.from('meal_items')
    .insert({ meal_id: mealId, food_id: foodId, servings }).select().single();
  return { row, error };
}

export async function updateItemServings(id, servings) {
  return supabase.from('meal_items').update({ servings }).eq('id', id);
}

export async function removeItem(id) { return supabase.from('meal_items').delete().eq('id', id); }
```

- [ ] **Step 2: Create `nutrition/views/food-picker.js` (shared modal)**

```js
const { ref, computed, h } = Vue;
import { data, loadFoods } from '../store.js';
import { itemMacros } from '../calc.js';

export function FoodPicker(onPick, onClose) {
  return {
    setup() {
      const q = ref(''); const chosen = ref(null); const servings = ref(1);
      if (!data.foods.length) loadFoods();
      const results = computed(() => data.foods.filter(f => f.name.toLowerCase().includes(q.value.toLowerCase())).slice(0, 30));
      const preview = computed(() => itemMacros(chosen.value, servings.value));
      const confirm = () => { if (chosen.value) onPick(chosen.value.id, Number(servings.value)); };
      return () => h('div', { class: 'modal', onClick: e => { if (e.target.classList.contains('modal')) onClose(); } }, [
        h('div', { class: 'sheet' }, [
          h('input', { class: 'search', placeholder: 'Search food', value: q.value, onInput: e => q.value = e.target.value }),
          h('ul', { class: 'pick-list' }, results.value.map(f =>
            h('li', { class: chosen.value?.id === f.id ? 'is-sel' : '', onClick: () => chosen.value = f },
              `${f.name} · ${f.serving_label}`))),
          chosen.value ? h('div', { class: 'servings' }, [
            h('label', 'Servings'),
            h('input', { type: 'number', step: '0.05', value: servings.value, onInput: e => servings.value = e.target.value }),
            h('span', { class: 'num' }, `${preview.value.calories} cal · P${preview.value.protein} F${preview.value.fat} C${preview.value.carb}`),
            h('button', { onClick: confirm }, 'Add'),
          ]) : null,
        ]),
      ]);
    },
  };
}
```

- [ ] **Step 3: Create `nutrition/views/plan-detail.js`**

```js
const { ref, reactive, computed, h, onMounted } = Vue;
import { loadPlan, addItem, updateItemServings, removeItem, data, loadFoods } from '../store.js';
import { itemMacros, sumMacros, vsTarget } from '../calc.js';
import { FoodPicker } from './food-picker.js';

export function PlanDetail(planId) {
  return {
    setup() {
      const st = reactive({ plan: null, days: [], meals: [], items: [] });
      const activeDay = ref(null);
      const picking = ref(null); // meal id being added to
      const foodsById = computed(() => Object.fromEntries(data.foods.map(f => [f.id, f])));

      const refresh = async () => {
        const r = await loadPlan(planId);
        Object.assign(st, r);
        if (!activeDay.value && r.days[0]) activeDay.value = r.days[0].id;
      };
      onMounted(async () => { if (!data.foods.length) await loadFoods(); await refresh(); });

      const mealsOfDay = (dayId) => st.meals.filter(m => m.day_id === dayId);
      const itemsOfMeal = (mealId) => st.items.filter(i => i.meal_id === mealId);
      const mealTotal = (mealId) => sumMacros(itemsOfMeal(mealId).map(i => itemMacros(foodsById.value[i.food_id], i.servings)));
      const dayTotal = (dayId) => sumMacros(mealsOfDay(dayId).map(m => mealTotal(m.id)));
      const target = computed(() => st.plan && {
        calories: st.plan.target_calories, protein: st.plan.target_protein,
        fat: st.plan.target_fat, carb: st.plan.target_carb });

      const onPick = async (foodId, servings) => { await addItem(picking.value, foodId, servings); picking.value = null; await refresh(); };
      const changeServings = async (id, v) => { await updateItemServings(id, Number(v)); await refresh(); };
      const del = async (id) => { await removeItem(id); await refresh(); };

      return () => {
        if (!st.plan) return h('div', 'Loading…');
        const dayId = activeDay.value;
        const cmp = vsTarget(dayTotal(dayId), target.value);
        return h('div', {}, [
          h('h1', st.plan.name),
          h('div', { class: 'day-tabs' }, st.days.map(d =>
            h('button', { class: ['day-tab', d.id === dayId ? 'is-active' : ''], onClick: () => activeDay.value = d.id }, d.label))),
          h('div', { class: 'targets' }, ['calories','protein','fat','carb'].map(k =>
            h('div', { class: 'target-row' }, [
              h('span', k),
              h('div', { class: 'bar' }, h('div', { class: ['fill', cmp[k].met ? 'met' : ''], style: { width: Math.min(100, cmp[k].pct) + '%' } })),
              h('span', { class: 'num' }, `${cmp[k].actual} / ${cmp[k].target ?? '—'}`),
            ]))),
          ...mealsOfDay(dayId).map(m => {
            const mt = mealTotal(m.id);
            return h('section', { class: 'meal' }, [
              h('div', { class: 'meal-head' }, [h('span', m.name), h('span', { class: 'num' }, `${mt.calories} cal`)]),
              h('ul', { class: 'item-list' }, itemsOfMeal(m.id).map(i => {
                const f = foodsById.value[i.food_id];
                return h('li', {}, [
                  h('span', f ? `${f.name} · ${f.serving_label}` : '—'),
                  h('input', { class: 'srv', type: 'number', step: '0.05', value: i.servings, onChange: e => changeServings(i.id, e.target.value) }),
                  h('button', { class: 'x', onClick: () => del(i.id) }, '×'),
                ]);
              })),
              h('button', { class: 'add-item', onClick: () => picking.value = m.id }, '+ add'),
            ]);
          }),
          picking.value ? h(FoodPicker(onPick, () => picking.value = null)) : null,
        ]);
      };
    },
  };
}
```

- [ ] **Step 4: Route it in `nutrition/app.js`**

```js
import { PlanDetail } from './views/plan-detail.js';
// in render: if (planId.value) return h(PlanDetail(planId.value));
```

- [ ] **Step 5: Add plan-detail + modal styles to `nutrition/styles.css`**

```css
.day-tabs { display: flex; gap: 6px; overflow-x: auto; margin: 8px 0; }
.day-tab { padding: 6px 12px; border: 1px solid var(--border); border-radius: 999px; background: none; color: var(--fg-mut); white-space: nowrap; }
.day-tab.is-active { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.targets { display: grid; gap: 6px; margin: 12px 0; }
.target-row { display: grid; grid-template-columns: 64px 1fr auto; gap: 8px; align-items: center; font-size: 13px; }
.bar { height: 8px; background: var(--bg-alt); border-radius: 999px; overflow: hidden; }
.fill { height: 100%; background: var(--fg-mut); }
.fill.met { background: #2e7d32; }
.meal { margin: 14px 0; }
.meal-head { display: flex; justify-content: space-between; font-weight: 600; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
.item-list { list-style: none; padding: 0; margin: 6px 0; }
.item-list li { display: grid; grid-template-columns: 1fr 64px 24px; gap: 8px; align-items: center; padding: 4px 0; font-size: 14px; }
.srv { width: 60px; padding: 4px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-alt); color: var(--fg); }
.x { border: 0; background: none; color: var(--fg-mut); font-size: 18px; }
.add-item { border: 1px dashed var(--border); background: none; color: var(--fg-mut); border-radius: 8px; padding: 6px; width: 100%; }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: flex-end; }
.sheet { background: var(--bg); width: 100%; max-height: 80vh; overflow: auto; border-radius: 16px 16px 0 0; padding: 16px; }
.pick-list { list-style: none; padding: 0; margin: 8px 0; }
.pick-list li { padding: 8px; border-bottom: 1px solid var(--border); }
.pick-list li.is-sel { background: var(--bg-alt); }
.servings { display: grid; grid-template-columns: auto 80px 1fr auto; gap: 8px; align-items: center; margin-top: 8px; }
```

- [ ] **Step 6: Verify the core loop**

Open a plan → day tabs switch days → "+ add" opens the food picker → search, pick, set servings (e.g. 0.75), see live preview → Add → the item shows, meal total updates, day targets bars update. Changing a serving inline recomputes totals. Deleting an item recomputes. Reload persists.

- [ ] **Step 7: Commit**

```bash
git add nutrition/store.js nutrition/views/food-picker.js nutrition/views/plan-detail.js nutrition/app.js nutrition/styles.css
git commit -m "feat(nutrition): plan detail with meals, items, live macro totals"
```

---

## Task 9: Settings — targets, theme, sign out

**Files:**
- Modify: `nutrition/store.js`, `nutrition/app.js`
- Create: `nutrition/views/settings.js`

- [ ] **Step 1: Add default-targets persistence to `nutrition/store.js`**

Store default targets on the user via `localStorage` for Phase 1 (applied to new plans in `createPlan`), plus a `signOut` re-export.
```js
const TKEY = 'fivecode.targets';
export function getTargets() {
  try { return JSON.parse(localStorage.getItem(TKEY)) || { calories: 3150, protein: 135, fat: 105, carb: 306 }; }
  catch { return { calories: 3150, protein: 135, fat: 105, carb: 306 }; }
}
export function setTargets(t) { localStorage.setItem(TKEY, JSON.stringify(t)); }
```
Update `createPlan` to read `getTargets()` instead of hard-coded numbers.

- [ ] **Step 2: Create `nutrition/views/settings.js`**

```js
const { reactive, h } = Vue;
import { getTargets, setTargets, signOut } from '../store.js';

export const Settings = {
  setup() {
    const t = reactive(getTargets());
    const save = () => setTargets({ ...t });
    const toggleTheme = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next; localStorage.setItem('theme', next);
    };
    const field = (k) => h('label', { class: 'set-row' }, [
      h('span', k), h('input', { type: 'number', value: t[k], onInput: e => t[k] = Number(e.target.value), onChange: save })]);
    return () => h('div', {}, [
      h('h1', 'Settings'),
      h('h2', { class: 'cat' }, 'Default daily targets'),
      field('calories'), field('protein'), field('fat'), field('carb'),
      h('button', { class: 'add-btn', onClick: toggleTheme }, 'Toggle theme'),
      h('button', { class: 'add-btn', onClick: () => signOut() }, 'Sign out'),
    ]);
  },
};
```
(Ensure `signOut` is exported from `store.js` — it is, from Task 5.)

- [ ] **Step 3: Route it in `nutrition/app.js`**

Import `{ Settings }` and render when `route.path.startsWith('/settings')`.

- [ ] **Step 4: Add settings styles**

```css
.set-row { display: grid; grid-template-columns: 1fr 120px; align-items: center; gap: 8px; padding: 6px 0; }
.set-row input { padding: 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-alt); color: var(--fg); }
```

- [ ] **Step 5: Verify**

`/nutrition/#/settings`: edit a target → create a new plan → it uses the new default. Toggle theme persists across reload. Sign out returns to the sign-in screen.

- [ ] **Step 6: Commit**

```bash
git add nutrition/store.js nutrition/views/settings.js nutrition/app.js nutrition/styles.css
git commit -m "feat(nutrition): settings — targets, theme, sign out"
```

---

## Task 10: Playwright smoke test

**Files:**
- Create: `tests/nutrition/smoke.spec.js`

- [ ] **Step 1: Write the smoke test**

```js
const { test, expect } = require('@playwright/test');

// Assumes a pre-authenticated storage state (Supabase session) saved to auth.json,
// created once manually via a signed-in browser and `context.storageState({ path: 'auth.json' })`.
test.use({ storageState: 'tests/nutrition/auth.json' });

test('add an item to a plan updates the day total', async ({ page }) => {
  await page.goto('http://localhost:8000/nutrition/#/plans');
  await page.getByPlaceholder('New plan name').fill('Smoke Plan');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: 'Smoke Plan' }).click();
  await page.getByRole('button', { name: '+ add' }).first().click();
  await page.getByPlaceholder('Search food').fill('Greek');
  await page.getByText(/Greek/).first().click();
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('.meal-head .num').first()).not.toHaveText('0 cal');
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test tests/nutrition/smoke.spec.js` (with `python3 -m http.server 8000` running and `auth.json` present).
Expected: PASS. If the repo has no Playwright config yet, add a minimal `playwright.config.js` mirroring existing test setup.

- [ ] **Step 3: Commit**

```bash
git add tests/nutrition/smoke.spec.js
git commit -m "test(nutrition): plan item smoke test"
```

---

## Task 11: Deploy

- [ ] **Step 1: Push the branch and open a PR**

```bash
git push -u origin feat/nutrition-tracker
```
Use `git diff main...HEAD` for the PR summary; include a test plan (calc unit tests, manual flows, smoke test).

- [ ] **Step 2: Merge to `main`**

GitHub Pages auto-deploys. Add the production redirect URL `https://henrybpan.com/nutrition/` to Supabase Auth in the dashboard/MCP before first production sign-in.

- [ ] **Step 3: Verify on your phone**

Visit `henrybpan.com/nutrition`, sign in via magic link, confirm library + a plan render and totals compute. Bookmark to home screen.

---

## Self-Review Notes

- **Spec coverage:** Auth (T5), Library seed+custom (T6), Plans/days/meals/items with live totals vs targets (T7–T8), Settings (T9), pure calc TDD (T3), schema+RLS (T2), smoke test (T10), noindex + direct-link (T1 shell). Phase 2 (Today/daily log) and Phase 3 intentionally excluded.
- **Type consistency:** macro objects always `{calories, protein, fat, carb}`; `itemMacros/sumMacros/vsTarget` signatures match across `calc.js`, `food-picker.js`, `plan-detail.js`. Store functions (`loadFoods/addFood/loadPlans/createPlan/loadPlan/addItem/updateItemServings/removeItem/getTargets/setTargets/signOut`) referenced consistently by views.
- **Open dependencies:** anon key + `SEED_USER_ID` require the Supabase MCP connected or dashboard access; `foods-seed.js` content generated from the xlsx Lists sheet at implementation time.
