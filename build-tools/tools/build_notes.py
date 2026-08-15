#!/usr/bin/env python3
"""Build the algebraic geometry LaTeX source into a static reader."""

from __future__ import annotations

import datetime as dt
import html
from html.parser import HTMLParser
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = pathlib.Path(
    os.environ.get("THREAD478_NOTES_SOURCE", ROOT / "source" / "algebraic_geometry")
).resolve()
OUTPUT = pathlib.Path(
    os.environ.get("THREAD478_NOTES_OUTPUT", ROOT / "public" / "notes" / "ag")
).resolve()
TOOLS = ROOT / "tools"
DIAGRAM_CACHE = ROOT / "build" / "notes-diagrams"


def run(command: list[str], *, cwd: pathlib.Path, env: dict[str, str] | None = None) -> None:
    print("+", " ".join(command), flush=True)
    result = subprocess.run(command, cwd=cwd, env=env, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)


def plain_text(fragment: str) -> str:
    fragment = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", fragment, flags=re.I)
    fragment = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", fragment, flags=re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


class HeadingParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self.headings: list[str] = []
        self.title = ""
        self._href: str | None = None
        self._link_text: list[str] = []
        self._heading_depth = 0
        self._heading_text: list[str] = []
        self._in_title = False
        self._title_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "a" and values.get("href"):
            self._href = values["href"]
            self._link_text = []
        if tag in {"h1", "h2", "h3"}:
            self._heading_depth += 1
            self._heading_text = []
        if tag == "title":
            self._in_title = True
            self._title_text = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._href is not None:
            self.links.append((self._href, "".join(self._link_text).strip()))
            self._href = None
        if tag in {"h1", "h2", "h3"} and self._heading_depth:
            value = "".join(self._heading_text).strip()
            if value:
                self.headings.append(value)
            self._heading_depth = 0
        if tag == "title":
            self.title = "".join(self._title_text).strip()
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._link_text.append(data)
        if self._heading_depth:
            self._heading_text.append(data)
        if self._in_title:
            self._title_text.append(data)


def read_html(path: pathlib.Path) -> HeadingParser:
    parser = HeadingParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def copy_assets() -> None:
    (OUTPUT / "assets" / "vendor").mkdir(parents=True, exist_ok=True)
    shutil.copy2(TOOLS / "notes.css", OUTPUT / "assets" / "notes.css")
    shutil.copy2(TOOLS / "notes.js", OUTPUT / "assets" / "notes.js")
    katex = ROOT / "node_modules" / "katex" / "dist"
    if not katex.exists():
        raise SystemExit("KaTeX is missing. Run npm install first.")
    shutil.copytree(katex, OUTPUT / "assets" / "vendor" / "katex", dirs_exist_ok=True)
    diagram_names: set[str] = set()
    for html_path in OUTPUT.glob("*.html"):
        diagram_names.update(
            re.findall(r'assets/diagrams/([a-f0-9]+\.svg)', html_path.read_text(encoding="utf-8"))
        )
    diagram_output = OUTPUT / "assets" / "diagrams"
    diagram_output.mkdir(parents=True, exist_ok=True)
    for name in sorted(diagram_names):
        shutil.copy2(DIAGRAM_CACHE / name, diagram_output / name)
    source_figures = SOURCE / "chapters" / "Part_II" / "fig"
    if source_figures.exists():
        shutil.copytree(source_figures, OUTPUT / "fig", dirs_exist_ok=True)


def assemble_latex() -> str:
    r"""Inline the preamble and subfiles because Pandoc does not expand \input."""
    master = (TOOLS / "web-main.tex").read_text(encoding="utf-8")

    def include(match: re.Match[str]) -> str:
        relative = match.group(1)
        path = TOOLS / "web-structure.tex" if relative == "structure" else SOURCE / relative
        if not path.suffix:
            path = path.with_suffix(".tex")
        content = path.read_text(encoding="utf-8")
        if relative != "structure":
            content = re.sub(r"^\\documentclass[^\n]*\n", "", content, count=1)
            content = re.sub(r"^\s*\\begin\{document\}\s*", "", content, count=1)
            content = re.sub(r"\\end\{document\}\s*$", "", content, count=1)
        return f"\n% BEGIN INLINED {relative}\n{content}\n% END INLINED {relative}\n"

    return re.sub(r"\\input\{([^}]+)\}", include, master)


def attach_manifest_links(manifest: dict) -> dict:
    parser = read_html(OUTPUT / "index.html")
    link_map: dict[str, str] = {}
    for href, label in parser.links:
        page_href = html.unescape(href).split("#", 1)[0].split("?", 1)[0]
        if page_href.endswith(".html"):
            # Pandoc 3 may append a heading fragment even to top-level chunk
            # links. The page filename is what the public catalog needs.
            link_map.setdefault(plain_text(label).casefold(), page_href)
    generated_title_aliases = {
        "category theory": "basic concepts of category theory",
        "global properties of morphisms of schemes": "global properties of morphisms",
        "projective schemes": "projective scheme",
        "the concept and basic theory of curves and surfaces": "the concept and basic theory of curves",
    }
    missing_links: list[str] = []
    for part in manifest["parts"]:
        for chapter in part["chapters"]:
            if chapter["status"] == "published":
                title_key = chapter["title"].casefold()
                title_key = generated_title_aliases.get(title_key, title_key)
                chapter["href"] = link_map.get(title_key)
                if not chapter["href"]:
                    missing_links.append(chapter["title"])
    if missing_links:
        joined = ", ".join(missing_links)
        raise SystemExit(f"published chapters have no generated page: {joined}")
    manifest["generated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    manifest["published_count"] = sum(
        chapter["status"] == "published"
        for part in manifest["parts"]
        for chapter in part["chapters"]
    )
    manifest["planned_count"] = sum(
        chapter["status"] == "planned"
        for part in manifest["parts"]
        for chapter in part["chapters"]
    )
    return manifest


def build_search() -> None:
    records = []
    for path in sorted(OUTPUT.glob("*.html")):
        if path.name == "index.html":
            continue
        raw = path.read_text(encoding="utf-8")
        parser = read_html(path)
        main_match = re.search(r'<main\b[^>]*class="[^"]*note-page[^"]*"[^>]*>([\s\S]*?)</main>', raw, re.I)
        body = main_match.group(1) if main_match else raw
        text = plain_text(body)
        records.append(
            {
                "href": path.name,
                "title": (parser.headings[0] if parser.headings else parser.title).replace(" – 代数几何札记", ""),
                "headings": parser.headings[1:40],
                "text": text[:48000],
            }
        )
    (OUTPUT / "search-index.json").write_text(
        json.dumps(records, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"search index: {len(records)} pages")


def validate() -> None:
    html_files = sorted(OUTPUT.glob("*.html"))
    failures: list[str] = []
    for path in html_files:
        raw = path.read_text(encoding="utf-8")
        if "\\begin{tikzcd}" in raw:
            failures.append(f"raw tikzcd remains in {path.name}")
        if "\\label" in raw:
            failures.append(f"raw LaTeX label remains in {path.name}")
        for match in re.finditer(r'(?:href|src)="([^"]+)"', raw):
            target = html.unescape(match.group(1)).split("#", 1)[0].split("?", 1)[0]
            if not target or target.startswith(("http:", "https:", "mailto:", "data:")):
                continue
            if target.startswith("../../"):
                continue
            resolved = (path.parent / target).resolve()
            if not resolved.exists():
                failures.append(f"missing {target} from {path.name}")
    if not html_files:
        failures.append("no HTML files generated")
    manifest_path = OUTPUT / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for part in manifest.get("parts", []):
            for chapter in part.get("chapters", []):
                if chapter.get("status") == "published" and not chapter.get("href"):
                    failures.append(f"published chapter has no href: {chapter.get('title', 'untitled')}")
    if failures:
        print("validation failed:", file=sys.stderr)
        for item in failures[:80]:
            print(" -", item, file=sys.stderr)
        raise SystemExit(1)
    print(f"validated: {len(html_files)} HTML pages, no missing local assets")


def install_output(staging: pathlib.Path, destination: pathlib.Path) -> None:
    """Replace the public output only after a complete build has validated."""
    backup = destination.with_name(f".{destination.name}-previous")
    if backup.exists():
        shutil.rmtree(backup)
    if destination.exists():
        destination.rename(backup)
    try:
        staging.rename(destination)
    except BaseException:
        if backup.exists() and not destination.exists():
            backup.rename(destination)
        raise
    else:
        if backup.exists():
            shutil.rmtree(backup)


def main() -> int:
    global OUTPUT
    if not SOURCE.exists():
        raise SystemExit(f"source directory not found: {SOURCE}")
    destination = OUTPUT
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = destination.with_name(f".{destination.name}-building")
    if staging.exists():
        shutil.rmtree(staging)
    OUTPUT = staging

    try:
        env = os.environ.copy()
        env["NOTES_DIAGRAM_DIR"] = str(DIAGRAM_CACHE)
        env["NOTES_DIAGRAM_SCRIPT"] = str(TOOLS / "render_tikzcd.py")
        env["NOTES_DIAGRAM_PYTHON"] = sys.executable
        build_input = SOURCE / ".thread478-web-main.tex"
        build_input.write_text(assemble_latex(), encoding="utf-8")
        resource_dirs = sorted({str(path.parent) for path in SOURCE.rglob("*.tex")})
        command = [
            "pandoc",
            str(build_input),
            "--from=latex+raw_tex",
            "--to=chunkedhtml",
            "--standalone",
            "--split-level=2",
            "--toc",
            "--toc-depth=3",
            f"--template={TOOLS / 'notes-template.html'}",
            f"--lua-filter={TOOLS / 'tikzcd.lua'}",
            "--katex=assets/vendor/katex/",
            "--citeproc",
            f"--bibliography={SOURCE / 'bibliography.bib'}",
            f"--resource-path={os.pathsep.join(resource_dirs)}",
            "--metadata=lang:en",
            "--metadata=title-prefix:代数几何札记",
            "--output",
            str(OUTPUT),
        ]
        try:
            run(command, cwd=SOURCE, env=env)
        finally:
            build_input.unlink(missing_ok=True)
        copy_assets()

        manifest = json.loads((TOOLS / "notes-manifest.json").read_text(encoding="utf-8"))
        manifest = attach_manifest_links(manifest)
        (OUTPUT / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        build_search()
        validate()
        install_output(OUTPUT, destination)
    finally:
        OUTPUT = destination
        if staging.exists():
            shutil.rmtree(staging)
    print(f"notes built at {destination}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
