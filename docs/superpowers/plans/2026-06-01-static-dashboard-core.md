# Static Dashboard Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `henrybpan.com` into a Camel-pack accountability dashboard whose homepage shows a live commitment scoreboard, an engraved latest-video plate, and the latest devotional — all driven by a static build pipeline that renders markdown devotionals and bakes a small `dates.json`.

**Architecture:** A Python build script reads markdown devotionals + a tiny config + the YouTube RSS feed, renders devotional pages and an archive, and writes `assets/data/dates.json`. The hand-authored `index.html` stays static; client JS fetches `dates.json` and renders the scoreboard (using a pure, unit-tested `scoreboard.js`), the engraved video plate (click-to-play), and the latest devotional. No runtime backend — the pledge counter and idea capture are a later phase.

**Tech Stack:** Static HTML/CSS/JS (GitHub Pages), ES modules in the browser, Python 3 build script (`markdown` lib + stdlib `urllib`/`xml.etree`), `pytest` for Python tests, `node --test` for JS tests. No bundler.

**Out of scope (own follow-on plans):** Black Series dark toggle (edits shared `theme.css`/`theme.js`), Reading-log & About pages, and all of Phase 2 (Cloudflare Worker: pledge counter + idea capture).

---

## File Structure

**Create:**
- `_commitments.json` — config: YouTube channel id + last-essay date (hand-maintained by Henry). No copy.
- `_devotionals/.gitkeep` — source folder for devotional markdown (`YYYY-MM-DD-slug.md` with frontmatter). Henry adds real entries; tests use temp fixtures.
- `scripts/dashboard_lib.py` — pure functions: `slugify`, `parse_frontmatter`, `parse_youtube_rss`, `build_dates`, `render_devotional_page`, `render_archive_page`.
- `scripts/build_dashboard.py` — orchestrator (IO): reads sources, fetches RSS, writes pages + `dates.json`.
- `tests/test_dashboard_lib.py` — pytest for `dashboard_lib.py`.
- `assets/scoreboard.js` — pure ES module: `devotionalStreak`, `devotionalStatus`, `videoStatus`, `essayStatus`.
- `test/scoreboard.test.mjs` — `node --test` for `scoreboard.js`.
- `assets/home.js` — homepage runtime: fetch `dates.json`, render scoreboard + plate + latest devotional.
- `assets/data/dates.json` — generated; an initial built copy is committed.

**Modify:**
- `index.html` — restructure homepage: scoreboard container, engraved plate markup, latest-devotional container, page-specific CSS, include `scoreboard.js` + `home.js`; expand cartouche nav.

**Generated (build output, committed):**
- `devotionals/index.html` — archive.
- `devotionals/<slug>/index.html` — one per entry.

---

## Conventions for generated pages

Every generated devotional/archive page is a themed page and MUST include (per `CLAUDE.md`):
- The anti-flash inline script in `<head>`.
- `<link rel="stylesheet" href="/assets/theme.css?v=13">`.
- The cartouche header + `.pack-frame`/`.sheet`/`.pack-corner` structure + `.blend-band`, matching `index.html`.
- Favicon `<link rel="icon" type="image/png" href="/favicon.png?v=4">`.

These are produced by the `render_*` functions so the template lives in exactly one place.

---

## Task 1: Config + source folder

**Files:**
- Create: `_commitments.json`
- Create: `_devotionals/.gitkeep`

- [ ] **Step 1: Create the config file**

`_commitments.json`:
```json
{
  "youtubeChannelId": "REPLACE_WITH_CHANNEL_ID",
  "lastEssay": "2025-11-01"
}
```
Note: `youtubeChannelId` is the channel's `UC...` id (find at YouTube → channel → "Share channel" → Copy channel ID). `lastEssay` is the date of the most recent essay; Henry bumps it when he ships one.

- [ ] **Step 2: Create the devotional source folder**

```bash
mkdir -p _devotionals && touch _devotionals/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add _commitments.json _devotionals/.gitkeep
git commit -m "chore: add dashboard config + devotional source folder"
```

---

## Task 2: Scoreboard pure logic (JS, TDD)

**Files:**
- Create: `assets/scoreboard.js`
- Test: `test/scoreboard.test.mjs`

- [ ] **Step 1: Write the failing tests**

`test/scoreboard.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { devotionalStreak, devotionalStatus, videoStatus, essayStatus } from '../assets/scoreboard.js';

test('streak counts consecutive days ending today', () => {
  const dates = ['2026-05-30', '2026-05-31', '2026-06-01'];
  assert.equal(devotionalStreak(dates, '2026-06-01'), 3);
});

test('streak survives one grace day (today missing, yesterday posted)', () => {
  const dates = ['2026-05-30', '2026-05-31'];
  assert.equal(devotionalStreak(dates, '2026-06-01'), 2);
});

test('streak is 0 when today and yesterday both missing', () => {
  const dates = ['2026-05-28', '2026-05-29'];
  assert.equal(devotionalStreak(dates, '2026-06-01'), 0);
});

test('streak ignores a gap', () => {
  const dates = ['2026-05-28', '2026-05-31', '2026-06-01'];
  assert.equal(devotionalStreak(dates, '2026-06-01'), 2);
});

test('devotionalStatus reports posted-today / grace / missed', () => {
  assert.equal(devotionalStatus(['2026-06-01'], '2026-06-01').status, 'posted-today');
  assert.equal(devotionalStatus(['2026-05-31'], '2026-06-01').status, 'grace');
  assert.equal(devotionalStatus(['2026-05-29'], '2026-06-01').status, 'missed');
});

test('videoStatus on-track within 7 days, due after', () => {
  assert.equal(videoStatus('2026-05-28', '2026-06-01').status, 'on-track');
  assert.equal(videoStatus('2026-05-28', '2026-06-01').daysLeft, 3);
  assert.equal(videoStatus('2026-05-20', '2026-06-01').status, 'due');
});

test('essayStatus done when in current calendar month, else due', () => {
  assert.equal(essayStatus('2026-06-01', '2026-06-15').status, 'done');
  assert.equal(essayStatus('2026-05-31', '2026-06-15').status, 'due');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/scoreboard.test.mjs`
Expected: FAIL — `Cannot find module '../assets/scoreboard.js'`.

- [ ] **Step 3: Implement the module**

`assets/scoreboard.js`:
```js
const DAY = 86400000;
const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fmtUTC = (ms) => new Date(ms).toISOString().slice(0, 10);
const ymd = (s) => s.split('-').map(Number);

export function devotionalStreak(dates, today) {
  const set = new Set(dates);
  let cur = toUTC(today);
  if (!set.has(fmtUTC(cur))) {
    cur -= DAY;
    if (!set.has(fmtUTC(cur))) return 0;
  }
  let streak = 0;
  while (set.has(fmtUTC(cur))) { streak++; cur -= DAY; }
  return streak;
}

export function devotionalStatus(dates, today) {
  const set = new Set(dates);
  const streak = devotionalStreak(dates, today);
  let status;
  if (set.has(today)) status = 'posted-today';
  else if (set.has(fmtUTC(toUTC(today) - DAY))) status = 'grace';
  else status = 'missed';
  return { streak, status };
}

export function videoStatus(lastVideo, today) {
  const diff = Math.floor((toUTC(today) - toUTC(lastVideo)) / DAY);
  const daysLeft = Math.max(0, 7 - diff);
  return { status: diff <= 7 ? 'on-track' : 'due', daysLeft, daysSince: diff };
}

export function essayStatus(lastEssay, today) {
  const [ly, lm] = ymd(lastEssay);
  const [ty, tm] = ymd(today);
  return { status: (ly === ty && lm === tm) ? 'done' : 'due' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/scoreboard.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/scoreboard.js test/scoreboard.test.mjs
git commit -m "feat: add unit-tested scoreboard streak/status logic"
```

---

## Task 3: Dashboard library — frontmatter + slug (Python, TDD)

**Files:**
- Create: `scripts/dashboard_lib.py`
- Test: `tests/test_dashboard_lib.py`

- [ ] **Step 1: Write the failing tests**

`tests/test_dashboard_lib.py`:
```python
from scripts.dashboard_lib import slugify, parse_frontmatter

def test_slugify_basic():
    assert slugify("On Waiting Well") == "on-waiting-well"

def test_slugify_strips_punctuation():
    assert slugify("Manna, not surplus!") == "manna-not-surplus"

def test_parse_frontmatter_splits_meta_and_body():
    raw = "---\ntitle: On Waiting Well\ndate: 2026-06-01\n---\nBody line one.\n"
    meta, body = parse_frontmatter(raw)
    assert meta["title"] == "On Waiting Well"
    assert meta["date"] == "2026-06-01"
    assert body.strip() == "Body line one."

def test_parse_frontmatter_requires_fence():
    raw = "no frontmatter here"
    meta, body = parse_frontmatter(raw)
    assert meta == {}
    assert body == "no frontmatter here"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_dashboard_lib.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.dashboard_lib'`.

- [ ] **Step 3: Implement `slugify` + `parse_frontmatter`**

Create `scripts/__init__.py` (empty) if it does not exist, then `scripts/dashboard_lib.py`:
```python
import re


def slugify(text):
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def parse_frontmatter(raw):
    """Return (meta_dict, body). Frontmatter is a leading --- ... --- block of key: value lines."""
    if not raw.startswith("---"):
        return {}, raw
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return {}, raw
    _, fm, body = parts
    meta = {}
    for line in fm.strip().splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    return meta, body.lstrip("\n")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_dashboard_lib.py -v`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/__init__.py scripts/dashboard_lib.py tests/test_dashboard_lib.py
git commit -m "feat: add devotional frontmatter + slug helpers"
```

---

## Task 4: Dashboard library — YouTube RSS parsing (Python, TDD)

**Files:**
- Modify: `scripts/dashboard_lib.py`
- Modify: `tests/test_dashboard_lib.py`
- Create: `tests/fixtures/youtube_feed.xml`

- [ ] **Step 1: Add a fixture feed**

`tests/fixtures/youtube_feed.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <yt:videoId>709ucVlxxEg</yt:videoId>
    <title>Latest essay-video</title>
    <published>2026-05-28T17:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>OLDER1234567</yt:videoId>
    <title>Older video</title>
    <published>2026-05-18T17:00:00+00:00</published>
  </entry>
</feed>
```

- [ ] **Step 2: Write the failing test**

Add to `tests/test_dashboard_lib.py`:
```python
from pathlib import Path
from scripts.dashboard_lib import parse_youtube_rss

def test_parse_youtube_rss_picks_newest():
    xml = Path("tests/fixtures/youtube_feed.xml").read_text()
    result = parse_youtube_rss(xml)
    assert result["latestVideo"]["id"] == "709ucVlxxEg"
    assert result["latestVideo"]["title"] == "Latest essay-video"
    assert result["lastVideo"] == "2026-05-28"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `python -m pytest tests/test_dashboard_lib.py::test_parse_youtube_rss_picks_newest -v`
Expected: FAIL — `ImportError: cannot import name 'parse_youtube_rss'`.

- [ ] **Step 4: Implement `parse_youtube_rss`**

Add to `scripts/dashboard_lib.py`:
```python
import xml.etree.ElementTree as ET

_ATOM = "{http://www.w3.org/2005/Atom}"
_YT = "{http://www.youtube.com/xml/schemas/2015}"


def parse_youtube_rss(xml_text):
    """Parse a YouTube channel Atom feed -> {latestVideo:{id,title}, lastVideo:'YYYY-MM-DD'}."""
    root = ET.fromstring(xml_text)
    entries = root.findall(f"{_ATOM}entry")
    parsed = []
    for e in entries:
        vid = e.findtext(f"{_YT}videoId")
        title = e.findtext(f"{_ATOM}title")
        published = e.findtext(f"{_ATOM}published")  # ISO 8601
        if vid and published:
            parsed.append((published, vid, title))
    if not parsed:
        return {"latestVideo": None, "lastVideo": None}
    parsed.sort(reverse=True)  # newest published first
    published, vid, title = parsed[0]
    return {"latestVideo": {"id": vid, "title": title}, "lastVideo": published[:10]}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python -m pytest tests/test_dashboard_lib.py -v`
Expected: PASS (5 tests total).

- [ ] **Step 6: Commit**

```bash
git add scripts/dashboard_lib.py tests/test_dashboard_lib.py tests/fixtures/youtube_feed.xml
git commit -m "feat: parse latest video from YouTube channel RSS"
```

---

## Task 5: Dashboard library — build dates.json (Python, TDD)

**Files:**
- Modify: `scripts/dashboard_lib.py`
- Modify: `tests/test_dashboard_lib.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_dashboard_lib.py`:
```python
from scripts.dashboard_lib import build_dates

def test_build_dates_assembles_payload():
    devos = [
        {"date": "2026-05-31", "title": "B", "slug": "b", "excerpt": "ex b"},
        {"date": "2026-06-01", "title": "A", "slug": "a", "excerpt": "ex a"},
    ]
    feed = {"latestVideo": {"id": "709ucVlxxEg", "title": "V"}, "lastVideo": "2026-05-28"}
    out = build_dates(devos, feed, last_essay="2025-11-01")
    assert out["devotionalDates"] == ["2026-05-31", "2026-06-01"]
    assert out["latestDevotional"]["slug"] == "a"   # newest by date
    assert out["latestVideo"]["id"] == "709ucVlxxEg"
    assert out["lastVideo"] == "2026-05-28"
    assert out["lastEssay"] == "2025-11-01"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_dashboard_lib.py::test_build_dates_assembles_payload -v`
Expected: FAIL — `ImportError: cannot import name 'build_dates'`.

- [ ] **Step 3: Implement `build_dates`**

Add to `scripts/dashboard_lib.py`:
```python
def build_dates(devotionals, feed, last_essay):
    """devotionals: list of {date,title,slug,excerpt}. Returns the dates.json payload."""
    ordered = sorted(devotionals, key=lambda d: d["date"])
    latest = ordered[-1] if ordered else None
    return {
        "devotionalDates": [d["date"] for d in ordered],
        "latestDevotional": latest,
        "latestVideo": feed.get("latestVideo"),
        "lastVideo": feed.get("lastVideo"),
        "lastEssay": last_essay,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_dashboard_lib.py -v`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
git add scripts/dashboard_lib.py tests/test_dashboard_lib.py
git commit -m "feat: assemble dates.json payload"
```

---

## Task 6: Dashboard library — page rendering (Python, TDD)

**Files:**
- Modify: `scripts/dashboard_lib.py`
- Modify: `tests/test_dashboard_lib.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_dashboard_lib.py`:
```python
from scripts.dashboard_lib import render_devotional_page, render_archive_page

def test_render_devotional_page_has_theme_and_content():
    html = render_devotional_page(
        title="On Waiting Well", date="2026-06-01", body_html="<p>Hello.</p>")
    assert "/assets/theme.css?v=13" in html
    assert "On Waiting Well" in html
    assert "<p>Hello.</p>" in html
    assert "blend-band" in html
    assert "localStorage.getItem('theme')" in html  # anti-flash script present

def test_render_archive_lists_entries_newest_first():
    entries = [
        {"date": "2026-05-31", "title": "B", "slug": "b"},
        {"date": "2026-06-01", "title": "A", "slug": "a"},
    ]
    html = render_archive_page(entries)
    assert html.index("/devotionals/a") < html.index("/devotionals/b")  # newest first
    assert "/assets/theme.css?v=13" in html
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_dashboard_lib.py -k render -v`
Expected: FAIL — `ImportError: cannot import name 'render_devotional_page'`.

- [ ] **Step 3: Implement the renderers**

Add to `scripts/dashboard_lib.py`:
```python
ANTI_FLASH = (
    "<script>(function(){try{var t=localStorage.getItem('theme');"
    "if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';"
    "document.documentElement.dataset.theme=t;}catch(e){"
    "document.documentElement.dataset.theme='light';}}());</script>"
)

CARTOUCHE = """      <header class=\"cartouche\">
        <div class=\"cartouche-name\"><a href=\"/\">HENRY <span class=\"cartouche-dot\"></span> PAN</a></div>
        <nav class=\"cartouche-nav\" aria-label=\"primary\">
          <a href=\"/devotionals\">devotionals</a>
          <a href=\"/lindy-library\">library</a>
          <a href=\"/essays\">writing</a>
          <a href=\"/graph\">graph</a>
          <a href=\"/about\">about</a>
          <a href=\"/contact\">contact</a>
        </nav>
      </header>"""


def _shell(title, inner):
    return f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\">
  {ANTI_FLASH}
  <link rel=\"icon\" type=\"image/png\" href=\"/favicon.png?v=4\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>{title}</title>
  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">
  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>
  <link href=\"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap\" rel=\"stylesheet\">
  <link rel=\"stylesheet\" href=\"/assets/theme.css?v=13\">
</head>
<body>
  <div class=\"pack-frame\">
    <span class=\"pack-corner tl\" aria-hidden=\"true\"><svg viewBox=\"0 0 56 40\" preserveAspectRatio=\"none\"><rect class=\"cnr-navy\" width=\"56\" height=\"40\"/><path class=\"cnr-cream\" d=\"M 56 22 L 56 40 L 22 40 a 6 6 0 0 1 6 -6 L 36 34 a 6 6 0 0 1 6 -6 L 50 28 a 6 6 0 0 1 6 -6 Z\"/></svg></span>
    <span class=\"pack-corner tr\" aria-hidden=\"true\"><svg viewBox=\"0 0 56 40\" preserveAspectRatio=\"none\"><rect class=\"cnr-navy\" width=\"56\" height=\"40\"/><path class=\"cnr-cream\" d=\"M 56 22 L 56 40 L 22 40 a 6 6 0 0 1 6 -6 L 36 34 a 6 6 0 0 1 6 -6 L 50 28 a 6 6 0 0 1 6 -6 Z\"/></svg></span>
    <main class=\"sheet\">
{CARTOUCHE}
{inner}
      <div class=\"blend-band\">PHILOSOPHY &amp; ECONOMICS BLEND</div>
    </main>
  </div>
</body>
</html>
"""


def render_devotional_page(title, date, body_html):
    inner = f"""      <article class=\"devotional\" style=\"max-width:640px;margin:0 auto;padding:0 1rem;\">
        <p class=\"list-label\" style=\"text-align:center\">{date}</p>
        <h1 style=\"font-family:var(--font-display);text-align:center;font-weight:500;\">{title}</h1>
        <div class=\"devotional-body\" style=\"font-size:1.1rem;line-height:1.75;\">{body_html}</div>
        <a href=\"/devotionals\" class=\"more-link\">all devotionals</a>
      </article>"""
    return _shell(title, inner)


def render_archive_page(entries):
    rows = sorted(entries, key=lambda e: e["date"], reverse=True)
    items = "\n".join(
        f'          <li><a href=\"/devotionals/{e["slug"]}\">'
        f'<span class=\"item-title\">{e["title"]}</span>'
        f'<span class=\"item-meta\">{e["date"]}</span></a></li>'
        for e in rows
    )
    inner = f"""      <section class=\"list-block\">
        <p class=\"list-label\">devotional · daily</p>
        <ul>
{items}
        </ul>
      </section>"""
    return _shell("Devotionals", inner)
```
Note: `.list-block`, `.list-label`, `.item-title`, `.item-meta`, `.more-link` exist only in `index.html`'s inline CSS — generated pages don't inherit it. Rather than moving those styles into shared `theme.css` (out of scope here), Step 4 adds a small inline `<style>` block to `_shell` so generated pages render the list correctly. The Step 3 tests don't assert on these styles, so they pass without Step 4; Step 4 is the visual completion.

- [ ] **Step 4: Make list styles available on generated pages**

Generated pages don't get `index.html`'s inline CSS. Add a small shared style block to `_shell` so `.list-block` etc. render. Insert this `<style>` immediately before `</head>` in `_shell` (edit the f-string):
```html
  <style>
    .list-block{max-width:640px;margin:0 auto;padding:0 1rem}
    .list-label{font-family:var(--font-caps);font-size:.6rem;letter-spacing:.3em;text-indent:.3em;font-weight:600;color:var(--ink-mut);text-transform:uppercase;text-align:center;margin-bottom:1.2rem}
    .list-block ul{list-style:none;display:flex;flex-direction:column;gap:.7rem}
    .list-block ul a{display:flex;align-items:baseline;justify-content:space-between;gap:1.5rem;text-decoration:none;color:var(--ink);padding:.15rem 0}
    .item-title{font-family:var(--font-display);font-style:italic;font-size:1.2rem;font-weight:500}
    .item-meta{font-family:var(--font-caps);font-size:.58rem;letter-spacing:.26em;text-transform:uppercase;color:var(--ink-dim);white-space:nowrap;align-self:center}
    .more-link{display:block;text-align:center;margin-top:1.4rem;font-family:var(--font-display);font-style:italic;color:var(--ink-mut);text-decoration:none}
    .more-link::before{content:"— ";color:var(--ink-dim)}
  </style>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m pytest tests/test_dashboard_lib.py -v`
Expected: PASS (8 tests total).

- [ ] **Step 6: Commit**

```bash
git add scripts/dashboard_lib.py tests/test_dashboard_lib.py
git commit -m "feat: render themed devotional + archive pages"
```

---

## Task 7: Build orchestrator (IO)

**Files:**
- Create: `scripts/build_dashboard.py`

- [ ] **Step 1: Write the orchestrator**

`scripts/build_dashboard.py`:
```python
#!/usr/bin/env python3
"""Build devotional pages + archive + assets/data/dates.json.

Usage: python scripts/build_dashboard.py [--offline]
  --offline  Skip the network YouTube RSS fetch; reuse existing dates.json video fields.
"""
import json
import sys
import urllib.request
from pathlib import Path

import markdown  # pip install markdown

from dashboard_lib import (
    slugify, parse_frontmatter, parse_youtube_rss, build_dates,
    render_devotional_page, render_archive_page,
)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_devotionals"
OUT = ROOT / "devotionals"
DATA = ROOT / "assets" / "data" / "dates.json"
CONFIG = ROOT / "_commitments.json"
RSS = "https://www.youtube.com/feeds/videos.xml?channel_id={cid}"


def load_devotionals():
    entries = []
    for md_file in sorted(SRC.glob("*.md")):
        meta, body = parse_frontmatter(md_file.read_text())
        if "title" not in meta or "date" not in meta:
            print(f"skip (missing title/date): {md_file.name}")
            continue
        slug = slugify(meta["title"])
        body_html = markdown.markdown(body)
        excerpt = body.strip().split("\n", 1)[0][:160]
        entries.append({
            "title": meta["title"], "date": meta["date"], "slug": slug,
            "excerpt": excerpt, "body_html": body_html,
        })
    return entries


def fetch_feed(cfg, offline):
    if offline:
        prev = json.loads(DATA.read_text()) if DATA.exists() else {}
        return {"latestVideo": prev.get("latestVideo"), "lastVideo": prev.get("lastVideo")}
    url = RSS.format(cid=cfg["youtubeChannelId"])
    with urllib.request.urlopen(url, timeout=15) as resp:
        return parse_youtube_rss(resp.read().decode("utf-8"))


def main():
    offline = "--offline" in sys.argv
    cfg = json.loads(CONFIG.read_text())
    entries = load_devotionals()

    OUT.mkdir(exist_ok=True)
    for e in entries:
        page_dir = OUT / e["slug"]
        page_dir.mkdir(exist_ok=True)
        (page_dir / "index.html").write_text(
            render_devotional_page(e["title"], e["date"], e["body_html"]))
    (OUT / "index.html").write_text(render_archive_page(
        [{"title": e["title"], "date": e["date"], "slug": e["slug"]} for e in entries]))

    feed = fetch_feed(cfg, offline)
    payload = build_dates(
        [{k: e[k] for k in ("date", "title", "slug", "excerpt")} for e in entries],
        feed, last_essay=cfg["lastEssay"])
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"built {len(entries)} devotionals; wrote {DATA.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Install the one dependency**

Run: `python -m pip install markdown`
Expected: `markdown` installs (or "already satisfied").

- [ ] **Step 3: Seed one real-but-temporary devotional to smoke-test**

Create `_devotionals/2026-06-01-smoke-test.md` (temporary — delete after; do NOT invent real devotional voice, this is a throwaway):
```markdown
---
title: Smoke Test Entry
date: 2026-06-01
---
Placeholder body for build verification only.
```

- [ ] **Step 4: Run the build offline and verify output**

Run: `cd scripts && python build_dashboard.py --offline; cd ..`
Expected: prints `built 1 devotionals; wrote assets/data/dates.json`. Verify files exist:
Run: `ls devotionals/smoke-test/index.html assets/data/dates.json`
Expected: both paths listed.

- [ ] **Step 5: Remove the smoke-test entry and its output, rebuild**

```bash
rm _devotionals/2026-06-01-smoke-test.md
rm -rf devotionals/smoke-test
cd scripts && python build_dashboard.py --offline; cd ..
```
Expected: `built 0 devotionals`. (`assets/data/dates.json` now has empty `devotionalDates` + null `latestDevotional`; that is fine — Task 8 handles empty states.)

- [ ] **Step 6: Commit**

```bash
git add scripts/build_dashboard.py assets/data/dates.json
git commit -m "feat: add dashboard build orchestrator"
```

---

## Task 8: Homepage runtime — render scoreboard, plate, latest devotional

**Files:**
- Create: `assets/home.js`

- [ ] **Step 1: Write the runtime module**

`assets/home.js`:
```js
import { devotionalStatus, videoStatus, essayStatus } from './scoreboard.js';

const todayISO = () => new Date().toISOString().slice(0, 10);

function setCell(id, big, unit, statusText, statusClass) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.sb-big').textContent = big;
  el.querySelector('.sb-unit').textContent = unit;
  const chip = el.querySelector('.sb-chip');
  chip.textContent = statusText;
  chip.className = 'sb-chip ' + statusClass;
}

function renderScoreboard(data, today) {
  const devo = devotionalStatus(data.devotionalDates || [], today);
  const devoMap = { 'posted-today': ['on track', 'ok'], grace: ['due today', 'due'], missed: ['missed', 'miss'] };
  const [devoText, devoClass] = devoMap[devo.status];
  setCell('sb-devo', devo.streak, 'day streak', devoText, devoClass);

  if (data.lastVideo) {
    const v = videoStatus(data.lastVideo, today);
    setCell('sb-video', v.status === 'on-track' ? v.daysLeft : '!', v.status === 'on-track' ? 'days left' : 'overdue',
      v.status === 'on-track' ? 'on track' : 'due', v.status === 'on-track' ? 'ok' : 'due');
  }
  if (data.lastEssay) {
    const e = essayStatus(data.lastEssay, today);
    setCell('sb-essay', e.status === 'done' ? '1' : '0', 'this month',
      e.status === 'done' ? 'done' : 'due', e.status === 'done' ? 'ok' : 'due');
  }
}

function renderPlate(data) {
  const plate = document.getElementById('video-plate');
  if (!plate || !data.latestVideo) return;
  const id = data.latestVideo.id;
  const img = plate.querySelector('img');
  img.src = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  img.alt = data.latestVideo.title || '';
  plate.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
    f.title = data.latestVideo.title || 'video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    plate.replaceChildren(f);
    plate.classList.add('is-playing');
  }, { once: true });
}

function renderLatestDevotional(data) {
  const slot = document.getElementById('latest-devotional');
  if (!slot || !data.latestDevotional) return;
  const d = data.latestDevotional;
  slot.innerHTML =
    `<a href="/devotionals/${d.slug}"><span class="item-title">${d.title}</span>` +
    `<span class="item-meta">${d.date}</span></a>`;
}

async function init() {
  try {
    const res = await fetch('/assets/data/dates.json', { cache: 'no-cache' });
    const data = await res.json();
    const today = todayISO();
    renderScoreboard(data, today);
    renderPlate(data);
    renderLatestDevotional(data);
  } catch (e) {
    console.error('dashboard data failed to load', e);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
```

- [ ] **Step 2: Commit**

```bash
git add assets/home.js
git commit -m "feat: homepage runtime renders scoreboard, plate, latest devotional"
```

(Verification of the runtime happens in Task 9 once the homepage markup exists.)

---

## Task 9: Restructure `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Expand the cartouche nav**

In `index.html`, replace the `<nav class="cartouche-nav" ...>...</nav>` block (currently essays/library/contact) with:
```html
        <nav class="cartouche-nav" aria-label="primary">
          <a href="/devotionals">devotionals</a>
          <a href="/lindy-library">library</a>
          <a href="/essays">writing</a>
          <a href="/graph">graph</a>
          <a href="/about">about</a>
          <a href="/contact">contact</a>
        </nav>
```

- [ ] **Step 2: Add page-specific CSS for the engraved plate + scoreboard**

In `index.html`, inside the existing `<style>` block (before its closing `</style>`), add:
```css
    /* Engraved video plate */
    .video-plate {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      cursor: pointer;
      border: 0.5px solid var(--ink);
      box-shadow: inset 0 0 0 3px var(--paper), inset 0 0 0 3.5px var(--ink);
      overflow: hidden;
      background: var(--paper-2);
    }
    .video-plate img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      filter: grayscale(1) contrast(1.15) brightness(1.06) sepia(0.28);
      mix-blend-mode: multiply;
    }
    .video-plate::after {
      content: ""; position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(circle, rgba(44,58,77,0.55) 0.5px, transparent 1px) 0 0/4px 4px,
        linear-gradient(0deg, rgba(201,137,104,0.12), rgba(201,137,104,0.12));
      mix-blend-mode: multiply; opacity: 0.55;
    }
    .video-plate .plate-play {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 58px; height: 58px; border-radius: 50%;
      background: rgba(236,232,222,0.9); border: 1px solid var(--ink);
      display: flex; align-items: center; justify-content: center; z-index: 2;
    }
    .video-plate .plate-play::after {
      content: ""; width: 0; height: 0;
      border-left: 17px solid var(--ink);
      border-top: 11px solid transparent; border-bottom: 11px solid transparent;
      margin-left: 4px;
    }
    .video-plate.is-playing { cursor: default; box-shadow: none; }
    .video-plate.is-playing::after, .video-plate.is-playing .plate-play { display: none; }
    .video-plate iframe { width: 100%; height: 100%; border: 0; display: block; }

    /* Scoreboard */
    .scoreboard {
      max-width: 640px; margin: 1.5rem auto 0;
      display: grid; grid-template-columns: repeat(3, 1fr);
      border-top: 0.5px solid var(--rule); border-bottom: 0.5px solid var(--rule);
    }
    .sb-cell { text-align: center; padding: 1rem 0.6rem; border-right: 0.5px solid var(--rule); }
    .sb-cell:last-child { border-right: 0; }
    .sb-label {
      font-family: var(--font-caps); font-size: 0.56rem; letter-spacing: 0.22em;
      text-transform: uppercase; color: var(--ink-mut); display: block; margin-bottom: 0.5rem;
    }
    .sb-big { font-family: var(--font-display); font-weight: 600; font-size: 2.2rem; line-height: 1; color: var(--ink); display: block; }
    .sb-unit { font-size: 0.72rem; color: var(--ink-dim); display: block; margin-top: 0.15rem; }
    .sb-chip {
      display: inline-block; margin-top: 0.55rem; font-family: var(--font-caps);
      font-size: 0.56rem; letter-spacing: 0.16em; text-transform: uppercase;
      padding: 0.12rem 0.6rem; border-radius: 20px; border: 0.5px solid var(--rule); color: var(--ink-mut);
    }
    .sb-chip.ok { color: #3f6f4a; border-color: #9bbf97; }
    .sb-chip.due { color: #9a6b1f; border-color: #d8bd84; }
    .sb-chip.miss { color: #a8443a; border-color: #d6a59c; }

    /* Latest devotional slot reuses .list-block styles already defined above */
    #latest-devotional a { display:flex; align-items:baseline; justify-content:space-between; gap:1.5rem; text-decoration:none; color:var(--ink); }
```

- [ ] **Step 3: Replace the hero video block with the engraved plate + scoreboard + latest devotional**

In `index.html`, replace the existing `<div class="video-wrap">...</div>` block with:
```html
      <div class="video-wrap">
        <div class="video-plate" id="video-plate" role="button" tabindex="0" aria-label="Play latest video">
          <img alt="">
          <span class="plate-play" aria-hidden="true"></span>
          <noscript><a href="https://www.youtube.com/@henrybpan">Watch on YouTube</a></noscript>
        </div>
      </div>

      <section class="scoreboard" aria-label="commitments">
        <div class="sb-cell" id="sb-devo"><span class="sb-label">1 Devo / Day</span><span class="sb-big">—</span><span class="sb-unit">day streak</span><span class="sb-chip"></span></div>
        <div class="sb-cell" id="sb-video"><span class="sb-label">1 Video / Week</span><span class="sb-big">—</span><span class="sb-unit"></span><span class="sb-chip"></span></div>
        <div class="sb-cell" id="sb-essay"><span class="sb-label">1 Essay / Month</span><span class="sb-big">—</span><span class="sb-unit">this month</span><span class="sb-chip"></span></div>
      </section>

      <div class="rule-pair"></div>

      <section class="list-block">
        <p class="list-label">latest devotional</p>
        <ul><li id="latest-devotional"></li></ul>
        <a href="/devotionals" class="more-link">all devotionals</a>
      </section>
```

- [ ] **Step 4: Include the scripts**

In `index.html`, immediately before `</body>`, add:
```html
  <script type="module" src="/assets/home.js?v=1"></script>
```
(`home.js` imports `scoreboard.js` itself, so only this one tag is needed.)

- [ ] **Step 5: Seed temporary devotionals + build, so the page has data to render**

Create two throwaway entries (deleted in Step 8):
```bash
printf -- '---\ntitle: Seed One\ndate: %s\n---\nFirst seed body.\n' "$(date -v-1d +%F 2>/dev/null || date -d yesterday +%F)" > _devotionals/seed-one.md
printf -- '---\ntitle: Seed Two\ndate: %s\n---\nSecond seed body.\n' "$(date +%F)" > _devotionals/seed-two.md
cd scripts && python build_dashboard.py --offline; cd ..
```
Note: `--offline` keeps `latestVideo` from the committed `dates.json`. If that field is null, the plate stays empty — that's expected; the live build (Task 10) fills it.

- [ ] **Step 6: Verify in the browser preview**

Start the dev server (preview_start) serving the repo root, open `/`, and confirm:
- Scoreboard shows `2` day streak with an "on track" chip (today seeded), Video + Essay cells render their chips.
- Latest devotional shows "Seed Two" linking to `/devotionals/seed-two`.
- No console errors from `home.js`.
- `/devotionals` archive lists both seeds newest-first; clicking one opens a themed devotional page with the pack frame + blend band.

Use preview_console_logs to confirm no errors and preview_screenshot to capture the homepage.

- [ ] **Step 7: Verify the engraved plate (with a known video id)**

Temporarily set a video in the data so the plate renders: edit `assets/data/dates.json`, set `"latestVideo": {"id": "709ucVlxxEg", "title": "Test"}`. Reload `/`. Confirm the plate shows a duotone engraved thumbnail (not full color) with a play button, and clicking it swaps to a playing iframe. Revert the manual edit afterward.

- [ ] **Step 8: Remove the seeds + rebuild clean**

```bash
rm _devotionals/seed-one.md _devotionals/seed-two.md
rm -rf devotionals/seed-one devotionals/seed-two
cd scripts && python build_dashboard.py --offline; cd ..
```

- [ ] **Step 9: Commit**

```bash
git add index.html assets/data/dates.json
git commit -m "feat: restructure homepage into pack dashboard (plate + scoreboard + latest devotional)"
```

---

## Task 10: Document the workflow + first live build

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Confirm the YouTube channel id**

Set the real `UC...` id in `_commitments.json` (`youtubeChannelId`). Then run a live build (network):
Run: `cd scripts && python build_dashboard.py; cd ..`
Expected: `assets/data/dates.json` now has a real `latestVideo` + `lastVideo`. Open `/` and confirm the plate shows the real latest video and the Video cell reflects the real last-upload date.

- [ ] **Step 2: Document the publishing workflow in CLAUDE.md**

Add a "## Accountability dashboard" section to `CLAUDE.md` describing:
```markdown
## Accountability dashboard

The homepage (`index.html`) is a Camel-pack accountability dashboard.

**Publishing a devotional:** add `_devotionals/YYYY-MM-DD-slug.md` with frontmatter
`title:` + `date:` (YYYY-MM-DD), body in markdown. Then run
`cd scripts && python build_dashboard.py` (omit `--offline` to refresh the latest
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

**Tests:** `python -m pytest tests/test_dashboard_lib.py` and
`node --test test/scoreboard.test.mjs`.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md _commitments.json assets/data/dates.json
git commit -m "docs: document devotional publishing + dashboard data flow"
```

---

## Done criteria

- `python -m pytest tests/test_dashboard_lib.py` → all pass.
- `node --test test/scoreboard.test.mjs` → all pass.
- Homepage renders the engraved plate (duotone → click-to-play), the live scoreboard (honest streak/status from today's date), and the latest devotional.
- `/devotionals` archive + individual devotional pages render in the pack theme.
- Adding a markdown file + running the build is the entire publishing flow.

## Follow-on plans (not in this plan)

1. **Black Series dark toggle** — re-introduce dark variables + toggle in shared `theme.css`/`theme.js`; bump `?v=N` sitewide; verify every themed page.
2. **Reading log & About** — extend `/lindy-library` with reviews; flesh out `/about` values (Henry supplies copy).
3. **Phase 2 — Cloudflare Worker** — pledge counter (GET/POST + Substack subscribe prompt) and you-only idea capture + public idea stream.
```
