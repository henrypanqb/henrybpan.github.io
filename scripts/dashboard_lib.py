import html
import re
import xml.etree.ElementTree as ET
from urllib.parse import quote


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


ANTI_FLASH = (
    "<script>(function(){try{var t=localStorage.getItem('theme');"
    "if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';"
    "document.documentElement.dataset.theme=t;}catch(e){"
    "document.documentElement.dataset.theme='light';}}());</script>"
)

CARTOUCHE = """      <header class="cartouche">
        <div class="cartouche-name"><a href="/">HENRY <span class="cartouche-dot"></span> PAN</a></div>
        <nav class="cartouche-nav" aria-label="primary">
          <a href="/devotionals">devotionals</a>
          <a href="/lindy-library">library</a>
          <a href="/essays">writing</a>
          <a href="/graph">graph</a>
          <a href="/about">about</a>
          <a href="/contact">contact</a>
        </nav>
      </header>"""

LIST_STYLES = """  <style>
    .list-block{max-width:640px;margin:0 auto;padding:0 1rem}
    .list-label{font-family:var(--font-caps);font-size:.6rem;letter-spacing:.3em;text-indent:.3em;font-weight:600;color:var(--ink-mut);text-transform:uppercase;text-align:center;margin-bottom:1.2rem}
    .list-block ul{list-style:none;display:flex;flex-direction:column;gap:.7rem}
    .list-block ul a{display:flex;align-items:baseline;justify-content:space-between;gap:1.5rem;text-decoration:none;color:var(--ink);padding:.15rem 0}
    .item-title{font-family:var(--font-display);font-style:italic;font-size:1.2rem;font-weight:500}
    .item-meta{font-family:var(--font-caps);font-size:.58rem;letter-spacing:.26em;text-transform:uppercase;color:var(--ink-dim);white-space:nowrap;align-self:center}
    .more-link{display:block;text-align:center;margin-top:1.4rem;font-family:var(--font-display);font-style:italic;color:var(--ink-mut);text-decoration:none}
    .more-link::before{content:"— ";color:var(--ink-dim)}
  </style>"""


def _shell(title, inner):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  {ANTI_FLASH}
  <link rel="icon" type="image/png" href="/favicon.png?v=4">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/theme.css?v=13">
{LIST_STYLES}
</head>
<body>
  <div class="pack-frame">
    <span class="pack-corner tl" aria-hidden="true"><svg viewBox="0 0 56 40" preserveAspectRatio="none"><rect class="cnr-navy" width="56" height="40"/><path class="cnr-cream" d="M 56 22 L 56 40 L 22 40 a 6 6 0 0 1 6 -6 L 36 34 a 6 6 0 0 1 6 -6 L 50 28 a 6 6 0 0 1 6 -6 Z"/></svg></span>
    <span class="pack-corner tr" aria-hidden="true"><svg viewBox="0 0 56 40" preserveAspectRatio="none"><rect class="cnr-navy" width="56" height="40"/><path class="cnr-cream" d="M 56 22 L 56 40 L 22 40 a 6 6 0 0 1 6 -6 L 36 34 a 6 6 0 0 1 6 -6 L 50 28 a 6 6 0 0 1 6 -6 Z"/></svg></span>
    <main class="sheet">
{CARTOUCHE}
{inner}
      <div class="blend-band">PHILOSOPHY &amp; ECONOMICS BLEND</div>
    </main>
  </div>
</body>
</html>
"""


def render_devotional_page(title, date, body_html):
    safe_title = html.escape(title)
    safe_date = html.escape(date)
    inner = f"""      <article class="devotional" style="max-width:640px;margin:0 auto;padding:0 1rem;">
        <p class="list-label" style="text-align:center">{safe_date}</p>
        <h1 style="font-family:var(--font-display);text-align:center;font-weight:500;">{safe_title}</h1>
        <div class="devotional-body" style="font-size:1.1rem;line-height:1.75;">{body_html}</div>
        <a href="/devotionals" class="more-link">all devotionals</a>
      </article>"""
    return _shell(safe_title, inner)


def render_archive_page(entries):
    rows = sorted(entries, key=lambda e: e["date"], reverse=True)
    items = "\n".join(
        f'          <li><a href="/devotionals/{quote(e["slug"])}">'
        f'<span class="item-title">{html.escape(e["title"])}</span>'
        f'<span class="item-meta">{html.escape(e["date"])}</span></a></li>'
        for e in rows
    )
    inner = f"""      <section class="list-block">
        <p class="list-label">devotional · daily</p>
        <ul>
{items}
        </ul>
      </section>"""
    return _shell("Devotionals", inner)
