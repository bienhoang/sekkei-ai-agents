"""Glossary management: CRUD operations for project terminology."""

import json
import os
import sys
from pathlib import Path

import yaml

ALLOWED_INDUSTRIES = {
    "finance", "medical", "manufacturing", "real-estate",
    "logistics", "retail", "insurance", "education",
    "government", "construction", "telecom", "automotive",
    "energy", "food-service", "common",
}
GLOSSARIES_DIR = Path(__file__).resolve().parent.parent.parent / "templates" / "glossaries"


def load_glossary(path: str) -> dict:
    """Load glossary from YAML file."""
    p = Path(path)
    if not p.exists():
        return {"project": "", "terms": []}
    return yaml.safe_load(p.read_text(encoding="utf-8")) or {"project": "", "terms": []}


def save_glossary(glossary: dict, path: str) -> None:
    """Save glossary to YAML file."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(
        yaml.dump(glossary, allow_unicode=True, default_flow_style=False),
        encoding="utf-8",
    )


def add_term(glossary: dict, ja: str, en: str, vi: str = "", context: str = "") -> dict:
    """Add a new term to the glossary."""
    # Check for duplicate
    for term in glossary.get("terms", []):
        if term.get("ja") == ja:
            term["en"] = en
            if vi:
                term["vi"] = vi
            if context:
                term["context"] = context
            return glossary

    glossary.setdefault("terms", []).append({"ja": ja, "en": en, "vi": vi, "context": context})
    return glossary


def find_term(glossary: dict, query: str) -> list[dict]:
    """Search for a term in any language field."""
    results = []
    q = query.lower()
    for term in glossary.get("terms", []):
        if (q in term.get("ja", "").lower()
                or q in term.get("en", "").lower()
                or q in term.get("vi", "").lower()):
            results.append(term)
    return results


def export_as_markdown(glossary: dict) -> str:
    """Export glossary as markdown table."""
    lines = [
        f"# 用語集 — {glossary.get('project', '')}",
        "",
        "| 日本語 | English | Tiếng Việt | コンテキスト |",
        "|--------|---------|------------|-------------|",
    ]
    for t in glossary.get("terms", []):
        lines.append(
            f"| {t.get('ja', '')} | {t.get('en', '')} | {t.get('vi', '')} | {t.get('context', '')} |"
        )
    return "\n".join(lines)


def handle_import(industry: str, glossary: dict) -> tuple[dict, int, int]:
    """Import pre-built industry glossary terms into project glossary.

    Returns (updated_glossary, imported_count, skipped_count).
    """
    if industry not in ALLOWED_INDUSTRIES:
        raise ValueError(f"Unknown industry: {industry}. Allowed: {', '.join(sorted(ALLOWED_INDUSTRIES))}")

    glossary_file = GLOSSARIES_DIR / f"{industry}.yaml"
    real_dir = os.path.realpath(GLOSSARIES_DIR)
    real_file = os.path.realpath(glossary_file)
    if not real_file.startswith(real_dir + os.sep):
        raise ValueError("Path traversal detected")

    if not glossary_file.exists():
        raise FileNotFoundError(f"Glossary file not found: {glossary_file}")

    data = yaml.safe_load(glossary_file.read_text(encoding="utf-8"))
    imported, skipped = 0, 0
    existing_ja = {t.get("ja") for t in glossary.get("terms", [])}

    for term in data.get("terms", []):
        ja = term.get("ja", "")
        if ja in existing_ja:
            skipped += 1
        else:
            glossary.setdefault("terms", []).append({
                "ja": ja,
                "en": term.get("en", ""),
                "vi": term.get("vi", ""),
                "context": term.get("context", ""),
            })
            existing_ja.add(ja)
            imported += 1

    return glossary, imported, skipped


def handle_action(action: str, data: dict) -> dict:
    """Route action to appropriate function."""
    path = data.get("project_path", "glossary.yaml")
    glossary = load_glossary(path)

    if action == "add":
        glossary = add_term(glossary, data["ja"], data["en"], data.get("vi", ""), data.get("context", ""))
        save_glossary(glossary, path)
        return {"success": True, "terms_count": len(glossary["terms"])}

    if action == "list":
        return {"terms": glossary.get("terms", []), "count": len(glossary.get("terms", []))}

    if action == "find":
        results = find_term(glossary, data.get("query", ""))
        return {"results": results, "count": len(results)}

    if action == "export":
        md = export_as_markdown(glossary)
        return {"content": md}

    if action == "import":
        industry = data.get("industry", "")
        glossary, imported, skipped = handle_import(industry, glossary)
        save_glossary(glossary, path)
        return {"success": True, "imported": imported, "skipped": skipped}

    return {"error": f"Unknown action: {action}"}


if __name__ == "__main__":
    input_data = json.loads(sys.stdin.read())
    result = handle_action(input_data["action"], input_data)
    print(json.dumps(result, ensure_ascii=False))
