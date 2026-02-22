"""Markdown -> PDF exporter using WeasyPrint with JP font support."""

import html as html_mod
import json
import re
import sys
from pathlib import Path

import mistune
import yaml

from .shared_styles import PDF_CSS

FRONTMATTER_RE = re.compile(r"^---\n([\s\S]*?)\n---\n([\s\S]*)$")


def extract_headings(html: str) -> list[dict]:
    """Extract headings from HTML for TOC generation."""
    headings = []
    for match in re.finditer(r"<h([1-4])[^>]*>(.*?)</h\1>", html):
        headings.append({"level": int(match.group(1)), "text": match.group(2)})
    return headings


def generate_toc_html(headings: list[dict]) -> str:
    """Generate HTML TOC from headings."""
    lines = ['<div class="toc">', "<h1>目次</h1>", "<ul>"]
    for h in headings:
        indent = "  " * (h["level"] - 1)
        lines.append(f'{indent}<li style="margin-left:{(h["level"]-1)*20}px">{h["text"]}</li>')
    lines.extend(["</ul>", "</div>"])
    return "\n".join(lines)


def generate_cover_html(meta: dict) -> str:
    """Generate cover page HTML."""
    title = html_mod.escape(meta.get("doc_type", "設計書"))
    project = html_mod.escape(meta.get("project_name", ""))
    version = html_mod.escape(str(meta.get("version", "1.0")))
    return f"""<div class="cover">
<h1>{title}</h1>
<p style="font-size:16pt;margin-top:40px;">{project}</p>
<p style="font-size:12pt;color:#666;">版数: {version}</p>
</div>"""


def md_to_html(content: str) -> tuple[str, dict]:
    """Convert markdown to HTML, extracting frontmatter."""
    meta = {}
    body = content

    fm_match = FRONTMATTER_RE.match(content)
    if fm_match:
        meta = yaml.safe_load(fm_match.group(1)) or {}
        body = fm_match.group(2)

    html = mistune.html(body)
    return html, meta


def export(content: str, doc_type: str, output_path: str, project_name: str = "") -> dict:
    """Main export: MD -> PDF via WeasyPrint."""
    from weasyprint import HTML  # lazy import for optional dependency

    body_html, meta = md_to_html(content)
    meta = {**meta, "doc_type": doc_type, "project_name": project_name}

    headings = extract_headings(body_html)
    cover = generate_cover_html(meta)
    toc = generate_toc_html(headings)

    full_html = f"""<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><style>{PDF_CSS}</style></head>
<body>
{cover}
{toc}
{body_html}
</body>
</html>"""

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    HTML(string=full_html).write_pdf(output_path)

    file_size = Path(output_path).stat().st_size
    return {"success": True, "file_path": output_path, "file_size": file_size}


if __name__ == "__main__":
    input_data = json.loads(sys.stdin.read())
    result = export(
        input_data["content"],
        input_data["doc_type"],
        input_data["output_path"],
        input_data.get("project_name", ""),
    )
    print(json.dumps(result))
