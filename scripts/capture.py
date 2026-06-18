#!/usr/bin/env python3
"""Easy capture for quotes, thoughts, and devotionals.

Appends a new entry to the JSON data files that the /quotes, /thoughts, and
/devotionals pages render from. No build step — edit the JSON (or run this),
then commit + push.

Usage:
    python3 scripts/capture.py            # interactive menu
    python3 scripts/capture.py quote
    python3 scripts/capture.py thought
    python3 scripts/capture.py devo

Multi-line bodies: type your text, then an empty line to finish.
"""
import json
import sys
import datetime
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data"


def load(name):
    path = DATA / name
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8") or "[]")
    return []


def save(name, items):
    path = DATA / name
    path.write_text(
        json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"✓ saved {path.relative_to(ROOT)} ({len(items)} entries)")


def ask(prompt):
    return input(prompt).strip()


def ask_multiline(label):
    print(f"{label} (type your text, end with an empty line):")
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line == "":
            break
        lines.append(line)
    return "\n".join(lines).strip()


def today():
    return datetime.date.today().isoformat()


def add_quote():
    text = ask_multiline("Quote")
    if not text:
        print("Empty quote — nothing added.")
        return
    author = ask("Author: ")
    items = load("quotes.json")
    items.append({"text": text, "author": author})
    save("quotes.json", items)


def add_thought():
    body = ask_multiline("Thought")
    if not body:
        print("Empty thought — nothing added.")
        return
    items = load("thoughts.json")
    items.insert(0, {"date": today(), "body": body})  # newest first
    save("thoughts.json", items)


def add_devo():
    title = ask("Title (optional): ")
    passage = ask("Passage (e.g. John 3:16): ")
    version = ask("Version [ESV]: ") or "ESV"
    body = ask_multiline("Devotional")
    if not body:
        print("Empty devotional — nothing added.")
        return
    entry = {"date": today(), "passage": passage, "version": version, "body": body}
    if title:
        entry["title"] = title
    items = load("devotionals.json")
    items.insert(0, entry)  # newest first
    save("devotionals.json", items)


LIBRARY_MEDIA = ["Book", "Movie", "TV show", "Podcast", "Essay"]
LIBRARY_STATUS = ["Reading", "To read", "Read", "To watch", "Watched"]


def pick(label, options, allow_blank=False):
    print(label + (" (or press enter for none)" if allow_blank else "") + ":")
    for i, opt in enumerate(options, 1):
        print(f"  {i}) {opt}")
    raw = ask("> ")
    if not raw and allow_blank:
        return ""
    if raw.isdigit() and 1 <= int(raw) <= len(options):
        return options[int(raw) - 1]
    for opt in options:
        if raw.lower() == opt.lower():
            return opt
    return raw


def add_library():
    title = ask("Title: ")
    if not title:
        print("Empty title — nothing added.")
        return
    author = ask("Author / creator: ")
    medium = pick("Category", LIBRARY_MEDIA)
    status = pick("Read tag", LIBRARY_STATUS, allow_blank=True)
    lindy = ask("Lindy / all-time favorite? (y/N): ").lower().startswith("y")
    url = ask("Link (optional): ")
    items = load("library.json")
    items.append({
        "title": title,
        "author": author,
        "medium": medium,
        "status": status,
        "lindy": lindy,
        "url": url,
    })
    save("library.json", items)


ACTIONS = {
    "quote": add_quote,
    "thought": add_thought,
    "devo": add_devo,
    "library": add_library,
}


def main():
    choice = sys.argv[1].lower() if len(sys.argv) > 1 else None
    if choice not in ACTIONS:
        print("What do you want to add?")
        print("  1) quote")
        print("  2) thought")
        print("  3) devo")
        print("  4) library")
        menu = {"1": "quote", "2": "thought", "3": "devo", "4": "library"}
        raw = ask("> ").lower()
        choice = menu.get(raw, raw if raw in ACTIONS else None)
    if choice not in ACTIONS:
        print("Nothing added.")
        return
    ACTIONS[choice]()
    print("Next: review the change, then `git add -A && git commit && git push`.")


if __name__ == "__main__":
    main()
