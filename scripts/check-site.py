#!/usr/bin/env python3
"""Validate the public static site offline. Run from any working directory."""

from collections import Counter, defaultdict
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://fr3k.dev"
SITEMAP = ORIGIN + "/sitemap.xml"
CSS_URL = re.compile(r"""url\(\s*["']?([^"'()\s]+)["']?\s*\)""", re.I)


def canonical(path):
    name = "/" + path.relative_to(ROOT).as_posix()
    return ORIGIN + (name.removesuffix("index.html") if path.name == "index.html"
                     else name.removesuffix(".html"))


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.source = source
        self.ids = Counter()
        self.refs = []
        self.meta = defaultdict(list)
        self.canonicals = []
        self.title = ""
        self.in_title = self.in_style = False
        self.feed(source.read_text())
        self.close()

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get("id"):
            self.ids[attrs["id"]] += 1
        if tag == "a" and attrs.get("name") and attrs.get("name") != attrs.get("id"):
            self.ids[attrs["name"]] += 1
        for key in ("href", "src", "poster", "action", "data-src", "data-fr3k-src"):
            if attrs.get(key):
                self.refs.append(attrs[key])
        if attrs.get("srcset"):
            self.refs.extend(candidate.split()[0] for candidate in attrs["srcset"].split(",")
                             if candidate.strip())
        self.refs.extend(CSS_URL.findall(attrs.get("style", "")))
        if tag == "meta":
            key = attrs.get("property") or attrs.get("name")
            if key:
                self.meta[key].append(attrs.get("content", ""))
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonicals.append(attrs.get("href", ""))
        self.in_title |= tag == "title"
        self.in_style |= tag == "style"

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_style:
            self.refs.extend(CSS_URL.findall(data))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "style":
            self.in_style = False


def public_files(suffix):
    return sorted(p for p in ROOT.rglob("*" + suffix)
                  if not any(part.startswith(".") or part == "node_modules"
                             for part in p.relative_to(ROOT).parts))


def main():
    pages = {p: Page(p) for p in public_files(".html")}
    errors = []
    count = 0

    def check(source, base, ref):
        nonlocal count
        url = urlsplit(urljoin(base, ref))
        if url.scheme not in ("https", "http") or url.netloc != "fr3k.dev":
            return
        count += 1
        path = ROOT / unquote(url.path).lstrip("/")
        if path.is_dir():
            path /= "index.html"
        elif not path.suffix and not path.is_file():
            path = path.with_suffix(".html")
        if not path.is_file() or not path.resolve().is_relative_to(ROOT):
            errors.append(f"{source}: missing local target {ref}")
        elif path in pages and url.fragment and unquote(url.fragment) not in pages[path].ids:
            errors.append(f"{source}: missing fragment {ref}")

    for path, page in pages.items():
        source = path.relative_to(ROOT)
        url = canonical(path)
        if page.canonicals != [url]:
            errors.append(f"{source}: expected one canonical {url}")
        if not page.title.strip():
            errors.append(f"{source}: missing title")
        for field in ("description", "og:title", "og:description", "og:image", "og:url", "twitter:card"):
            values = page.meta[field]
            if len(values) != 1 or not values[0].strip():
                errors.append(f"{source}: expected one nonempty {field}")
        if page.meta["og:url"] != [url]:
            errors.append(f"{source}: og:url must match canonical")
        for image in page.meta["og:image"] + page.meta["twitter:image"]:
            if not image.startswith(ORIGIN + "/"):
                errors.append(f"{source}: expected an absolute local preview image")
            check(source, url, image)
        for item, occurrences in page.ids.items():
            if occurrences > 1:
                errors.append(f"{source}: repeated id {item}")
        for ref in page.refs:
            check(source, url, ref)

    for path in public_files(".css"):
        for ref in CSS_URL.findall(path.read_text()):
            check(path.relative_to(ROOT), ORIGIN + "/" + path.relative_to(ROOT).as_posix(), ref)

    # The social library builds clip and caption links in the browser.
    manifest = ROOT / "blackwave/social/data/campaign-media.json"
    for asset in json.loads(manifest.read_text())["assets"]:
        for field in ("output", "caption"):
            check(manifest.relative_to(ROOT), ORIGIN + "/blackwave/social/", asset[field])
        if asset["kind"] == "short":
            visual = Path(asset["output"]).stem + "-visual.mp4"
            check("blackwave/theatre/", ORIGIN + "/blackwave/social/media/visuals/", visual)

    # The installable flash console resolves its icons and launch URL against its manifest.
    for path in public_files(".webmanifest"):
        data = json.loads(path.read_text())
        source = path.relative_to(ROOT)
        base = ORIGIN + "/" + source.as_posix()
        for ref in [data["start_url"], *(icon["src"] for icon in data.get("icons", []))]:
            check(source, base, ref)

    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        urls = [el.text for el in ET.parse(sitemap).iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        if sorted(urls) != sorted(canonical(path) for path in pages):
            errors.append("sitemap.xml: expected every canonical page exactly once")
    else:
        errors.append("sitemap.xml missing")
    robots = ROOT / "robots.txt"
    if not robots.is_file() or not re.search(
            r"^Sitemap:\s*" + re.escape(SITEMAP) + r"\s*$", robots.read_text(), re.M | re.I):
        errors.append("robots.txt: missing sitemap declaration")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"PASS: {len(pages)} public HTML pages, {count} local references, social metadata and sitemap.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
