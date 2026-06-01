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
