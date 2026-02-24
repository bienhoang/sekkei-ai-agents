"""Diff analysis: detect upstream changes and find downstream impacts."""

import json
import re
import sys
from datetime import date


def extract_sections(content: str) -> dict[str, str]:
    """Split markdown into sections by headings."""
    sections = {}
    current_heading = "_preamble"
    current_lines = []

    for line in content.split("\n"):
        match = re.match(r"^(#{1,4})\s+(.+)$", line)
        if match:
            if current_lines:
                sections[current_heading] = "\n".join(current_lines)
            current_heading = match.group(2).strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        sections[current_heading] = "\n".join(current_lines)

    return sections


# Whitelisted ID prefixes — must match id-extractor.ts ID_TYPES
_ID_PREFIXES = (
    "F", "REQ", "NFR", "SCR", "TBL", "API",
    "CLS", "DD", "TS",
    "UT", "IT", "ST", "UAT",
    "SEC", "PP", "TP",
    "OP", "MIG",
    "EV", "MTG", "ADR", "IF", "PG",
)
_ID_PATTERN = re.compile(
    r"\b(?:" + "|".join(_ID_PREFIXES) + r")-\d{1,4}\b"
)


def extract_ids(content: str) -> set[str]:
    """Extract cross-reference IDs using whitelisted prefixes (matches id-extractor.ts)."""
    return set(_ID_PATTERN.findall(content))


def diff_documents(old_content: str, new_content: str) -> dict:
    """Compute section-level diff between old and new versions."""
    old_sections = extract_sections(old_content)
    new_sections = extract_sections(new_content)

    added = [s for s in new_sections if s not in old_sections]
    removed = [s for s in old_sections if s not in new_sections]
    modified = [
        s for s in new_sections
        if s in old_sections and new_sections[s] != old_sections[s]
    ]

    old_ids = extract_ids(old_content)
    new_ids = extract_ids(new_content)
    added_ids = list(new_ids - old_ids)
    removed_ids = list(old_ids - new_ids)

    return {
        "added_sections": added,
        "removed_sections": removed,
        "modified_sections": modified,
        "added_ids": added_ids,
        "removed_ids": removed_ids,
    }


def find_downstream_impacts(
    changed_ids: list[str], downstream_content: str
) -> list[dict]:
    """Find which downstream sections reference changed IDs."""
    sections = extract_sections(downstream_content)
    impacts = []

    for section_name, section_content in sections.items():
        referenced = [cid for cid in changed_ids if cid in section_content]
        if referenced:
            impacts.append({
                "section": section_name,
                "referenced_ids": referenced,
                "needs_update": True,
            })

    return impacts


def build_changes_list(old_content: str, new_content: str, diff: dict) -> list[dict]:
    """Build structured changes list with change_type tags."""
    old_sections = extract_sections(old_content)
    new_sections = extract_sections(new_content)
    changes = []

    for section in diff["added_sections"]:
        changes.append({
            "section": section,
            "change_type": "add",
            "content": new_sections.get(section, ""),
        })
    for section in diff["removed_sections"]:
        changes.append({
            "section": section,
            "change_type": "del",
            "content": old_sections.get(section, ""),
        })
    for section in diff["modified_sections"]:
        changes.append({
            "section": section,
            "change_type": "mod",
            "before": old_sections.get(section, ""),
            "after": new_sections.get(section, ""),
        })

    return changes


def build_line_level_diffs(old_content: str, new_content: str, diff: dict) -> list[dict]:
    """Build line-level diffs within modified sections using SequenceMatcher."""
    import difflib

    old_sections = extract_sections(old_content)
    new_sections = extract_sections(new_content)
    line_diffs = []

    for section in diff["modified_sections"]:
        old_text = old_sections.get(section, "")
        new_text = new_sections.get(section, "")
        old_lines = old_text.split("\n")
        new_lines = new_text.split("\n")

        matcher = difflib.SequenceMatcher(None, old_lines, new_lines)
        section_diffs = []

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                continue
            section_diffs.append({
                "type": tag,  # "replace", "insert", "delete"
                "old_lines": old_lines[i1:i2] if tag in ("replace", "delete") else [],
                "new_lines": new_lines[j1:j2] if tag in ("replace", "insert") else [],
            })

        if section_diffs:
            line_diffs.append({
                "section": section,
                "diffs": section_diffs,
            })

    return line_diffs


def build_revision_history_row(diff: dict) -> dict:
    """Generate a suggested 改訂履歴 row from diff results."""
    parts = []
    if diff["added_sections"]:
        parts.append(f"追加: {', '.join(diff['added_sections'][:3])}")
    if diff["removed_sections"]:
        parts.append(f"削除: {', '.join(diff['removed_sections'][:3])}")
    if diff["modified_sections"]:
        parts.append(f"変更: {', '.join(diff['modified_sections'][:3])}")
    summary = "; ".join(parts) if parts else "軽微な修正"

    return {
        "版数": "+0.1",
        "日付": date.today().isoformat(),
        "変更内容": summary,
        "変更者": "",
    }


def build_marked_document(content: str, changes: list[dict]) -> str:
    """Insert 【新規】/【変更】/【削除】 markers into table cells of the document."""
    lines = content.split("\n")
    section_markers = {}
    for change in changes:
        marker = {"add": "【新規】", "del": "【削除】", "mod": "【変更】"}.get(change["change_type"], "")
        if marker:
            section_markers[change["section"]] = marker

    result = []
    current_section = "_preamble"
    in_table = False

    for line in lines:
        heading_match = re.match(r"^(#{1,4})\s+(.+)$", line)
        if heading_match:
            current_section = heading_match.group(2).strip()
            in_table = False
            result.append(line)
            continue

        # Detect table rows (not separator)
        is_table_row = re.match(r"^\|(.+)\|$", line.strip()) and not re.match(r"^\|[\s\-:|]+\|$", line.strip())
        if is_table_row and current_section in section_markers:
            marker = section_markers[current_section]
            cells = line.strip().split("|")
            # Mark first data cell (cells[0] is empty from leading |)
            if len(cells) > 2:
                cells[1] = f" {marker}{cells[1].strip()} "
            line = "|".join(cells)

        result.append(line)

    return "\n".join(result)


def analyze(upstream_old: str, upstream_new: str, downstream: str, revision_mode: bool = False) -> dict:
    """Full analysis: diff upstream, find downstream impacts."""
    diff = diff_documents(upstream_old, upstream_new)

    all_changed_ids = diff["added_ids"] + diff["removed_ids"]
    # Also extract IDs from modified sections
    old_sections = extract_sections(upstream_old)
    new_sections = extract_sections(upstream_new)
    for section in diff["modified_sections"]:
        old_ids = extract_ids(old_sections.get(section, ""))
        new_ids = extract_ids(new_sections.get(section, ""))
        all_changed_ids.extend(list(old_ids.symmetric_difference(new_ids)))

    all_changed_ids = list(set(all_changed_ids))
    impacts = find_downstream_impacts(all_changed_ids, downstream)

    result = {
        "diff": diff,
        "changed_ids": all_changed_ids,
        "impacts": impacts,
        "total_impacted_sections": len(impacts),
    }

    if revision_mode:
        changes = build_changes_list(upstream_old, upstream_new, diff)
        result["changes"] = changes
        result["revision_history_row"] = build_revision_history_row(diff)
        result["marked_document"] = build_marked_document(upstream_new, changes)
        result["line_diffs"] = build_line_level_diffs(upstream_old, upstream_new, diff)

    return result


if __name__ == "__main__":
    input_data = json.loads(sys.stdin.read())
    result = analyze(
        input_data["upstream_old"],
        input_data["upstream_new"],
        input_data["downstream"],
    )
    print(json.dumps(result, ensure_ascii=False))
