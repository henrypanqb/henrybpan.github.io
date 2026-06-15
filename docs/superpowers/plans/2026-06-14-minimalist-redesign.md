# Minimalist Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Camel-pack dashboard homepage with a minimalist, text-first front door (Satoshi, flat cream, grey/black, left-aligned, no icons) — archiving the old homepage and reusing existing real content, without touching any legacy page or its stylesheet.

**Architecture:** A brand-new shared stylesheet `/assets/minimal.css` powers five redesigned pages (`/`, `/writings/`, `/library/`, `/about/`, `/contact/`). The legacy `theme.css?v=13` and every existing page are left byte-for-byte unchanged; the old homepage is copied to `/archive/index.html`. Plain static HTML/CSS, no build step.

**Tech Stack:** Static HTML5 + CSS. Satoshi via Fontshare CDN. Python `http.server` for local verification.

---

## File Structure

- Create: `assets/minimal.css` — the only shared stylesheet for redesigned pages.
- Create: `archive/index.html` — verbatim copy of current `index.html`.
- Modify: `index.html` — replace with minimalist homepage.
- Create: `writings/index.html` — essay index linking to Substack.
- Create: `library/index.html` — three-tier recommendations page.
- Modify: `about/index.html` — re-skin to minimal.css, copy kept verbatim.
- Modify: `contact/index.html` — re-skin to minimal.css, copy kept verbatim.

Legacy untouched: `assets/theme.css`, `assets/home.js`, `assets/scoreboard.js`, `lindy-library/`, `essays/`, `devotionals/`, `director/`, `graph/`, `card/`, etc.

---

## Task 1: Archive the current homepage

**Files:**
- Create: `archive/index.html` (copy of current `index.html`)

- [ ] **Step 1: Copy the current homepage into the archive**

```bash
mkdir -p archive
cp index.html archive/index.html
```

- [ ] **Step 2: Verify the archive still references absolute asset paths**

Run: `grep -c '/assets/theme.css' archive/index.html`
Expected: `1` (the copy points at the untouched `theme.css`, so it renders identically).

- [ ] **Step 3: Commit**

```bash
git add archive/index.html
git commit -m "chore: archive current dashboard homepage at /archive"
```

---

## Task 2: Create the shared minimalist stylesheet

**Files:**
- Create: `assets/minimal.css`

- [ ] **Step 1: Write `assets/minimal.css`**

```css
/* ============================================================
   MINIMAL THEME — redesign front door
   Flat cream + grey/black ink + Satoshi. Left-aligned, text-first.
   Used ONLY by the redesigned pages (/, /writings, /library,
   /about, /contact). Does NOT touch legacy theme.css.
============================================================ */

:root {
  --font: 'Satoshi', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --paper: #ece8de;   /* flat cream — same hue as legacy, no texture */
  --ink:   #1c1c1c;   /* primary grey-black */
  --mut:   #6b6b6b;   /* muted/secondary */
  --rule:  #cfc9bb;   /* hairline on cream */
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font);
  font-size: clamp(1rem, 1.2vw, 1.075rem);
  line-height: 1.6;
  font-weight: 400;
}

.wrap {
  max-width: 640px;
  margin: 0 auto;
  padding: clamp(3rem, 9vh, 6rem) clamp(1.25rem, 5vw, 2rem) 4rem;
}

/* Page heading (name / page title) */
.title {
  font-size: clamp(1.6rem, 4vw, 2.1rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 1.6rem;
}

/* Home link / back link at top of inner pages */
.home-link {
  display: inline-block;
  color: var(--mut);
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 2rem;
}
.home-link:hover { color: var(--ink); }

/* Primary nav list on the homepage — plain text, no icons */
.nav { list-style: none; }
.nav li { margin: 0.45rem 0; }
.nav a {
  color: var(--ink);
  text-decoration: none;
  font-size: clamp(1.05rem, 1.6vw, 1.2rem);
  font-weight: 500;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s ease;
}
.nav a:hover { border-color: var(--ink); }

/* Body copy (about / contact) */
.prose p { margin: 0 0 1em; max-width: 60ch; }
.prose a {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--rule);
  text-underline-offset: 3px;
}
.prose a:hover { text-decoration-color: var(--ink); }

/* Recommendation / essay lists */
.section { margin: 0 0 2.75rem; }
.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mut);
  margin-bottom: 0.9rem;
}
.list { list-style: none; }
.list li { margin: 0.5rem 0; }
.list a, .list .row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  color: var(--ink);
  text-decoration: none;
}
.list a:hover .row-title { border-color: var(--ink); }
.row-title {
  font-weight: 500;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s ease;
}
.row-meta { color: var(--mut); font-size: 0.92em; }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/minimal.css
git commit -m "feat: add minimalist shared stylesheet"
```

---

## Task 3: Build the minimalist homepage

**Files:**
- Modify: `index.html` (full replace)

- [ ] **Step 1: Replace `index.html` with the minimalist homepage**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/png" href="/favicon.png?v=4">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Henry Pan — writing, reading, and recommendations.">
  <meta property="og:title" content="Henry Pan">
  <meta property="og:description" content="Writing, reading, and recommendations.">
  <meta property="og:image" content="https://henrybpan.com/preview.png?v=4">
  <meta property="og:url" content="https://henrybpan.com/">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://henrybpan.com/">
  <title>Henry Pan</title>
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap">
  <link rel="stylesheet" href="/assets/minimal.css?v=1">
</head>
<body>
  <main class="wrap">
    <h1 class="title">Henry Pan</h1>
    <ul class="nav">
      <li><a href="/writings/">Writings</a></li>
      <li><a href="/library/">Library</a></li>
      <li><a href="https://www.youtube.com/@henrybpan" target="_blank" rel="noopener noreferrer">YouTube</a></li>
      <li><a href="https://www.instagram.com/henrybpan" target="_blank" rel="noopener noreferrer">Instagram</a></li>
      <li><a href="/about/">About</a></li>
      <li><a href="/contact/">Contact</a></li>
    </ul>
  </main>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: minimalist homepage"
```

---

## Task 4: Build the Writings page

**Files:**
- Create: `writings/index.html`

Real essay titles (already on the site): "how to make your first video",
"why do people watch me?", "on burnout", "pursuing greatness".
Substack root: `https://henrybpan.substack.com/`. Exact per-post URLs are a
pending Henry input — link each title to the Substack root for now and mark the
`href` with a `TODO(henry)` comment so it is trivially findable.

- [ ] **Step 1: Create `writings/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/png" href="/favicon.png?v=4">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Essays by Henry Pan.">
  <title>writings — Henry Pan</title>
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap">
  <link rel="stylesheet" href="/assets/minimal.css?v=1">
</head>
<body>
  <main class="wrap">
    <a class="home-link" href="/">Henry Pan</a>
    <h1 class="title">Writings</h1>
    <ul class="list">
      <!-- TODO(henry): swap each href for the exact Substack post URL -->
      <li><a href="https://henrybpan.substack.com/" target="_blank" rel="noopener noreferrer"><span class="row-title">how to make your first video</span></a></li>
      <li><a href="https://henrybpan.substack.com/" target="_blank" rel="noopener noreferrer"><span class="row-title">why do people watch me?</span></a></li>
      <li><a href="https://henrybpan.substack.com/" target="_blank" rel="noopener noreferrer"><span class="row-title">on burnout</span></a></li>
      <li><a href="https://henrybpan.substack.com/" target="_blank" rel="noopener noreferrer"><span class="row-title">pursuing greatness</span></a></li>
    </ul>
  </main>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add writings/index.html
git commit -m "feat: writings page linking to Substack"
```

---

## Task 5: Build the Library page (three tiers)

**Files:**
- Create: `library/index.html`
- Reference (read-only, for real data): `lindy-library/index.html`

Data extraction: the existing `lindy-library/index.html` contains `.book-title` /
`.book-author` rows and a `Lindy` tag on the best items. Before writing, list the
real rows and which carry the `Lindy` tag:

```bash
grep -nE 'book-title|book-author|>Lindy<|book-tag tag-medium">[A-Za-z]' lindy-library/index.html
```

Use that output to populate the two tiers below with the **real** titles/creators
(do not invent). The `Lindy` tier = rows whose card includes the `Lindy` tag; the
`Books & movies` tier = the remaining real rows. Drop the `[Title]`/`[Author]`
template placeholder row. Medium (Book/Movie/TV Show/Podcast) goes in `.row-meta`.

- [ ] **Step 1: Extract the real library rows**

Run the grep above; keep its output handy to fill the lists in Step 2.

- [ ] **Step 2: Create `library/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/png" href="/favicon.png?v=4">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Henry Pan's library — the best things he's read and watched, plus a running log.">
  <title>library — Henry Pan</title>
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap">
  <link rel="stylesheet" href="/assets/minimal.css?v=1">
</head>
<body>
  <main class="wrap">
    <a class="home-link" href="/">Henry Pan</a>
    <h1 class="title">Library</h1>

    <section class="section">
      <p class="section-label">Lindy — the best I've ever read or watched</p>
      <ul class="list">
        <!-- Fill from Step 1: each Lindy-tagged real row -->
        <li><span class="row"><span class="row-title">{{TITLE}}</span><span class="row-meta">{{AUTHOR}} · {{MEDIUM}}</span></span></li>
      </ul>
    </section>

    <section class="section">
      <p class="section-label">Books &amp; movies</p>
      <ul class="list">
        <!-- Fill from Step 1: remaining real read/watched rows -->
        <li><span class="row"><span class="row-title">{{TITLE}}</span><span class="row-meta">{{AUTHOR}} · {{MEDIUM}}</span></span></li>
      </ul>
    </section>

    <section class="section">
      <p class="section-label">Essays online</p>
      <!-- TODO(henry): paste external essay links here. Empty until provided — no placeholders. -->
      <ul class="list"></ul>
    </section>
  </main>
</body>
</html>
```

Replace every `{{...}}` token with real extracted values; remove leftover template
`<li>` rows. The "Essays online" `<ul>` stays empty (with the TODO comment) until
Henry provides links.

- [ ] **Step 3: Verify no template tokens remain**

Run: `grep -cE '\{\{|\[Title\]|\[Author\]' library/index.html`
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add library/index.html
git commit -m "feat: three-tier library page (Lindy / books & movies / essays online)"
```

---

## Task 6: Re-skin the About page

**Files:**
- Modify: `about/index.html`
- Reference: current `about/index.html` (existing body copy — keep verbatim)

- [ ] **Step 1: Read the existing About body copy**

Run: `sed -n '/<body/,/<\/body>/p' about/index.html`
Copy out the real paragraph text inside `.about-body` (and any links). Do not
reword it.

- [ ] **Step 2: Rewrite `about/index.html` using minimal.css, keeping copy verbatim**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/png" href="/favicon.png?v=4">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="About Henry Pan.">
  <title>about — Henry Pan</title>
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap">
  <link rel="stylesheet" href="/assets/minimal.css?v=1">
</head>
<body>
  <main class="wrap">
    <a class="home-link" href="/">Henry Pan</a>
    <h1 class="title">About</h1>
    <div class="prose">
      <!-- Paste the verbatim paragraphs extracted in Step 1, each wrapped in <p>...</p>.
           Preserve existing links (UVA, Clipcut, Good Marketing Company, etc.) with
           target="_blank" rel="noopener noreferrer" on external ones. -->
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add about/index.html
git commit -m "refactor: re-skin About to minimalist theme"
```

---

## Task 7: Re-skin the Contact page

**Files:**
- Modify: `contact/index.html`
- Reference: current `contact/index.html` (existing contact methods — keep verbatim)

- [ ] **Step 1: Read the existing Contact content**

Run: `sed -n '/<body/,/<\/body>/p' contact/index.html`
Copy out the real contact methods/links (email `work@henrybpan.com`, any socials
referenced in the body, the intro sentence). Keep wording verbatim.

- [ ] **Step 2: Rewrite `contact/index.html` using minimal.css**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/png" href="/favicon.png?v=4">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Contact Henry Pan.">
  <title>contact — Henry Pan</title>
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap">
  <link rel="stylesheet" href="/assets/minimal.css?v=1">
</head>
<body>
  <main class="wrap">
    <a class="home-link" href="/">Henry Pan</a>
    <h1 class="title">Contact</h1>
    <div class="prose">
      <!-- Paste the verbatim intro sentence + contact links extracted in Step 1.
           Email as <a href="mailto:work@henrybpan.com">. External links keep
           target="_blank" rel="noopener noreferrer". No icons. -->
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add contact/index.html
git commit -m "refactor: re-skin Contact to minimalist theme"
```

---

## Task 8: Verify the whole thing

**Files:** none (verification only)

- [ ] **Step 1: Serve locally**

```bash
python3 -m http.server 8000
```

- [ ] **Step 2: Check each redesigned page loads (200)**

Run:
```bash
for p in / /writings/ /library/ /about/ /contact/; do
  printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8000$p"
done
```
Expected: each prints `200`.

- [ ] **Step 3: Confirm the archive and legacy pages still load**

Run:
```bash
for p in /archive/ /lindy-library/ /essays/ /devotionals/; do
  printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8000$p"
done
```
Expected: each prints `200`.

- [ ] **Step 4: Confirm legacy stylesheet untouched**

Run: `git diff --stat main -- assets/theme.css`
Expected: no output (theme.css unchanged versus main).

- [ ] **Step 5: Run existing automated tests (regression guard)**

Run: `python3 -m pytest tests/ -q && node --test test/ 2>/dev/null || true`
Expected: existing suites pass (this change touches none of their code).

- [ ] **Step 6: Visual spot-check**

Open `http://localhost:8000/` in a browser. Confirm: flat cream `#ece8de`
background, grey/black Satoshi text, left-aligned single column, six plain text
links, no icons, no frame. Click through Writings, Library, About, Contact.

- [ ] **Step 7: Stop the server**

```bash
# Ctrl-C the http.server process
```

---

## Pending Henry inputs (do not invent)

1. Exact per-post Substack URLs for the four Writings titles (Task 4).
2. The "essays online" external link list for the Library third tier (Task 5).

Both are wired with findable `TODO(henry)` markers; everything else ships now.
