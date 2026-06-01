#!/usr/bin/env python3
"""Build devotional pages + archive + assets/data/dates.json.

Usage: python build_dashboard.py [--offline]
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
