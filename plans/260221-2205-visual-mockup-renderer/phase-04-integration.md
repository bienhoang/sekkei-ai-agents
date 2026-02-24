# Phase 4: Integration & Instruction Update

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-mockup-schema-and-parser.md), [Phase 3](./phase-03-playwright-renderer.md)
- Current instructions: `mcp-server/src/lib/screen-design-instructions.ts`
- Skill file: `skills/sekkei/SKILL.md`

## Overview
- **Priority:** High (connects all pieces)
- **Status:** pending
- **Effort:** 1.5h
- **Description:** Update AI instructions to output YAML instead of ASCII, wire post-generation rendering hook into SKILL.md workflow, update table format with `#` column

## Key Insights
- `generate_document` MCP tool returns template + instructions for skill layer to use — it does NOT write files itself
- SKILL.md orchestrates: calls MCP tool → AI generates content → skill saves file → **NEW: skill calls render**
- Screen design generation is triggered by SKILL.md `basic-design` sub-command in split mode
- The rendering step happens AFTER the AI generates screen-design.md, BEFORE saving final output
- `screen-design-instructions.ts` is the only file that tells AI what format to use for section 1

## Requirements

### Functional
- Update `buildScreenDesignInstruction()` to instruct AI to output YAML block (not ASCII)
- Provide YAML schema reference in instructions so AI knows exact format
- Update `画面項目定義` table header to include `#` column
- Add post-generation render step in SKILL.md workflow
- Update `screen-design.md` template to reflect new format

### Non-Functional
- Backward compatible: if YAML block not found in markdown, skip rendering gracefully
- Clear instructions to AI about YAML format (examples help)

## Architecture

```
SKILL.md basic-design split workflow (current):
  1. generate_document(scope: "feature") → basic-design.md
  2. generate_document(screen_input) → screen-design.md  ← MODIFY instructions
  3. Save screen-design.md to features/{id}/

NEW workflow (Phase 4):
  1. generate_document(scope: "feature") → basic-design.md
  2. generate_document(screen_input) → screen-design.md  ← YAML layout in section 1
  3. Save screen-design.md
  4. renderScreenDesign(screen-design.md, outputDir)     ← NEW: auto-render PNGs
  5. Update markdown: replace YAML block with ![](./images/SCR-xxx.png) + keep YAML in comment
```

## Related Code Files

### Modified Files
| File | Change | LOC Est |
|------|--------|---------|
| `mcp-server/src/lib/screen-design-instructions.ts` | Replace ASCII instruction with YAML format instruction | ~30 lines changed |
| `templates/ja/screen-design.md` | Update section 1 comment + add `#` to section 2 table | ~10 lines changed |
| `skills/sekkei/SKILL.md` | Add post-generation render step in basic-design workflow | ~20 lines added |
| `mcp-server/src/lib/generation-instructions.ts` | Check if any basic-design instructions reference screen format | ~5 lines changed |

## Implementation Steps

1. **Update `screen-design-instructions.ts`**:

   Replace section 1 instructions (lines 82-84):
   ```
   BEFORE:
   `## 1. ${h[0]}`,
   `Provide an ASCII wireframe or detailed layout description.`,
   `Label each UI region (header, sidebar, main content, footer, modal).`,

   AFTER:
   `## 1. ${h[0]}`,
   `Provide a structured YAML layout block inside a \`\`\`yaml code fence.`,
   `This YAML will be rendered into a visual mockup image with numbered annotations.`,
   ``,
   `### YAML Layout Format`,
   `\`\`\`yaml`,
   `layout_type: form   # form | dashboard | list | detail | modal | wizard`,
   `viewport: desktop   # desktop | tablet | mobile`,
   `regions:`,
   `  header:`,
   `    components:`,
   `      - {n: 1, type: logo, label: "ロゴ"}`,
   `      - {n: 2, type: nav, label: "ナビゲーション"}`,
   `  main:`,
   `    style: centered-form   # optional layout hint`,
   `    components:`,
   `      - {n: 3, type: text-input, label: "フィールド名", required: true}`,
   `      - {n: 4, type: button, label: "送信", variant: primary}`,
   `  footer:`,
   `    components:`,
   `      - {n: 5, type: text, label: "フッターテキスト"}`,
   `\`\`\``,
   ``,
   `**Rules:**`,
   `- \`n\` values must be sequential starting from 1 and unique across all regions`,
   `- \`n\` numbers correspond to the # column in the 画面項目定義 table (section 2)`,
   `- Use appropriate component types: text-input, password-input, textarea, select, checkbox, radio, button, link, table, card, nav, logo, text, search-bar, tabs, pagination`,
   `- \`variant\` for buttons: primary, secondary, danger`,
   `- \`required: true\` marks mandatory fields (shows ※ in mockup)`,
   ```

2. **Update `画面項目定義` table header** in same file (line 87):
   ```
   BEFORE: items: "| 項目ID | 項目名 | 型 | 必須 | 初期値 | 備考 |"
   AFTER:  items: "| # | 項目ID | 項目名 | 型 | 必須 | 初期値 | 備考 |"
   ```
   Do same for `en` and `vi` table headers:
   ```
   en: items: "| # | Item ID | Item Name | Type | Required | Default | Notes |"
   vi: items: "| # | Mã Mục | Tên Mục | Loại | Bắt buộc | Mặc định | Ghi chú |"
   ```

   Add instruction that `#` column uses circled numbers ①②③ matching the YAML `n` values.

3. **Update `templates/ja/screen-design.md`**:

   Section 1 comment:
   ```
   BEFORE:
   <!-- AI: Provide an ASCII wireframe or detailed layout description. -->

   AFTER:
   <!-- AI: Provide a structured YAML layout block (see instructions).
        The YAML will be auto-rendered to a PNG mockup with numbered annotations.
        After rendering, this section will contain an image: ![SCR-xxx](./images/SCR-xxx.png) -->
   ```

   Section 2 table header:
   ```
   BEFORE: | 項目ID | 項目名 | 型 | 必須 | 初期値 | 備考 |
   AFTER:  | # | 項目ID | 項目名 | 型 | 必須 | 初期値 | 備考 |
   ```

4. **Update `skills/sekkei/SKILL.md`** — add render step after screen-design generation:

   After the existing step `Save output to features/{feature-id}/screen-design.md`, add:
   ```markdown
   iv. Render screen mockup images (auto):
       - If `screen-design.md` contains YAML layout blocks in section 1:
         a. Parse YAML layouts from the saved file
         b. For each screen, render PNG mockup to `features/{feature-id}/images/SCR-{ID}.png`
         c. In the markdown, insert `![SCR-{ID}](./images/SCR-{ID}.png)` after the YAML block
         d. Keep YAML block in a `<!-- yaml-source ... -->` HTML comment for re-rendering
       - If Playwright not available, skip rendering; YAML block stays as-is (still readable)
       - Log rendered paths to stderr
   ```

5. **Check `generation-instructions.ts`** for any references to ASCII wireframes in basic-design instructions — update if found.

6. **Compile check**: `npm run lint`

## Todo List
- [ ] Update `buildScreenDesignInstruction()` — YAML format instead of ASCII
- [ ] Update TABLE_HEADERS — add `#` column to items table (ja, en, vi)
- [ ] Add YAML format rules in instruction (sequential n, component types)
- [ ] Update `screen-design.md` template comments and table header
- [ ] Add render step to SKILL.md basic-design workflow
- [ ] Add instruction that `#` uses circled numbers ①②③
- [ ] Check generation-instructions.ts for ASCII references
- [ ] Compile check passes

## Success Criteria
- `buildScreenDesignInstruction()` outputs YAML format instructions
- AI generates YAML blocks when following new instructions
- Table header includes `#` column in all 3 languages
- SKILL.md documents post-render workflow step
- Backward compat: missing YAML → skip render gracefully

## Risk Assessment
- **AI ignores YAML format**: Clear example + strict format description reduces this. Validation in Phase 1 catches it.
- **Existing screen-design files break**: Old files have ASCII, not YAML → `parseScreenLayouts()` returns empty, render skipped gracefully
- **SKILL.md changes break other sub-commands**: Render step only in screen-design path of basic-design split flow

## Security Considerations
- YAML instructions don't introduce injection vectors — AI generates content, not user
- No file path manipulation — output paths constructed from validated feature_name

## Next Steps
- Phase 5 writes integration tests covering the full flow
- Future: MCP tool `render_mockup` for standalone re-rendering
