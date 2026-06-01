from pathlib import Path

from scripts.dashboard_lib import slugify, parse_frontmatter, parse_youtube_rss, build_dates, render_devotional_page, render_archive_page


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


def test_parse_youtube_rss_picks_newest():
    xml = Path("tests/fixtures/youtube_feed.xml").read_text()
    result = parse_youtube_rss(xml)
    assert result["latestVideo"]["id"] == "709ucVlxxEg"
    assert result["latestVideo"]["title"] == "Latest essay-video"
    assert result["lastVideo"] == "2026-05-28"


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
