import re
import xml.etree.ElementTree as ET


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
