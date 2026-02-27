# Management Phase Commands

Command workflows for management/governance documents (meeting-minutes, decision-record).

## `/sekkei:meeting-minutes @notes`

**No prerequisites.** Meeting minutes are standalone documents.

**Interview questions (ask before generating):**
- Meeting date, time, and location?
- Meeting purpose/agenda?
- Attendees list?

1. Read the input (raw meeting notes, voice transcript, or summary)
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "meeting-minutes"`, `input_content: @notes`, `language` from config
4. Follow these rules strictly:
   - ID format: `MTG-001`
   - Separate decisions (合意事項) from discussions (議論事項) clearly
   - Each action item: single owner + specific deadline (not "soon" or "TBD")
   - Reference affected doc IDs (REQ-xxx, SCR-xxx, F-xxx) where applicable
5. Save output to `{output.directory}/09-management/meeting-minutes-{date}.md`
6. Call MCP tool `validate_document` with saved content, `doc_type: "meeting-minutes"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.

## `/sekkei:decision-record @notes`

**No prerequisites.** Decision records are standalone documents.

**Interview questions (ask before generating):**
- What decision is being documented?
- What options were considered?
- Who participated in the decision?

1. Read the input (discussion notes, design review output, or decision summary)
2. If `sekkei.config.yaml` exists, load project metadata — get `output.directory` and `language`
3. Call MCP tool `generate_document` with `doc_type: "decision-record"`, `input_content: @notes`, `language` from config
4. Follow these rules strictly:
   - ID format: `ADR-001`
   - At least 2 options in 検討事項 (show rejected alternatives)
   - Decision MUST reference affected doc IDs (REQ-xxx, NFR-xxx, F-xxx, API-xxx)
   - One decision per ADR — split compound decisions into separate records
5. Save output to `{output.directory}/09-management/adr-{number}-{slug}.md`
6. Call MCP tool `validate_document` with saved content, `doc_type: "decision-record"`.
   **Post-generation validation (mandatory):** If validation reports errors: fix inline before finalizing.
