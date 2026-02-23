"""CLI entry point for Sekkei Python processing. Called by TS MCP server via subprocess."""

import json
import os
import sys


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: cli.py <action>"}), file=sys.stderr)
        sys.exit(1)

    action = sys.argv[1]

    # Read input from env var or stdin
    raw = os.environ.get("SEKKEI_INPUT")
    if raw:
        input_data = json.loads(raw)
    else:
        input_data = json.loads(sys.stdin.read())

    try:
        if action == "export-excel":
            from export.excel_exporter import export
            result = export(
                input_data["content"],
                input_data["doc_type"],
                input_data["output_path"],
                input_data.get("project_name", ""),
            )

        elif action == "export-pdf":
            from export.pdf_exporter import export
            result = export(
                input_data["content"],
                input_data["doc_type"],
                input_data["output_path"],
                input_data.get("project_name", ""),
            )

        elif action == "diff":
            from nlp.diff_analyzer import analyze
            result = analyze(
                input_data["upstream_old"],
                input_data["upstream_new"],
                input_data["downstream"],
                revision_mode=input_data.get("revision_mode", False),
            )

        elif action == "export-docx":
            from export.docx_exporter import export as export_docx
            result = export_docx(
                input_data["content"],
                input_data.get("doc_type", ""),
                input_data["output_path"],
                input_data.get("project_name", ""),
            )

        elif action == "export-matrix":
            from export.matrix_exporter import export_matrix
            result = export_matrix(
                input_data["content"],
                input_data["matrix_type"],
                input_data["output_path"],
                input_data.get("project_name", ""),
            )

        elif action == "import-excel":
            from import_pkg.excel_importer import import_excel
            result = import_excel(
                input_data["file_path"],
                doc_type_hint=input_data.get("doc_type_hint"),
                sheet_name=input_data.get("sheet_name"),
            )

        else:
            result = {"error": f"Unknown action: {action}"}

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
