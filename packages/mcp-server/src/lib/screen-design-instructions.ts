/**
 * Screen design generation instructions for split-mode basic-design.
 * Extracted from generation-instructions.ts to stay under 200 LOC limit.
 */

/** Section headings per language */
const SECTION_HEADINGS: Record<string, string[]> = {
  ja: [
    "画面レイアウト",
    "画面項目定義",
    "バリデーション一覧",
    "イベント一覧",
    "画面遷移",
    "権限",
  ],
  en: [
    "Screen Layout",
    "Screen Item Definitions",
    "Validation Rules",
    "Event List",
    "Screen Transitions",
    "Permissions",
  ],
  vi: [
    "Bố cục Màn hình",
    "Định nghĩa Mục Màn hình",
    "Quy tắc Validation",
    "Danh sách Sự kiện",
    "Chuyển đổi Màn hình",
    "Quyền hạn",
  ],
};

/** Table headers per language */
const TABLE_HEADERS: Record<string, Record<string, string>> = {
  ja: {
    items: "| # | 項目ID | 項目名 | 型 | 必須 | 初期値 | 備考 |",
    validation: "| 項目ID | ルール | メッセージ | タイミング |",
    events: "| トリガー | アクション | 遷移先/処理 |",
    transition: "| 遷移元 | 遷移先 | 条件 |",
    permissions: "| ロール | 閲覧 | 編集 | 削除 |",
  },
  en: {
    items: "| # | Item ID | Item Name | Type | Required | Default | Notes |",
    validation: "| Item ID | Rule | Message | Timing |",
    events: "| Trigger | Action | Destination/Process |",
    transition: "| Source | Destination | Condition |",
    permissions: "| Role | View | Edit | Delete |",
  },
  vi: {
    items: "| # | Mã Mục | Tên Mục | Loại | Bắt buộc | Mặc định | Ghi chú |",
    validation: "| Mã Mục | Quy tắc | Thông báo | Thời điểm |",
    events: "| Trigger | Hành động | Đích/Xử lý |",
    transition: "| Nguồn | Đích | Điều kiện |",
    permissions: "| Vai trò | Xem | Sửa | Xóa |",
  },
};

/**
 * Condensed YAML layout format hint for inline use in generation instructions.
 * Used by basic-design and screen-design GENERATION_INSTRUCTIONS entries.
 */
export function buildInlineYamlLayoutHint(): string {
  return [
    "For each screen in 画面一覧, provide a structured YAML layout block inside a ```yaml code fence.",
    "This YAML describes the screen layout structure. For visual HTML mockups, use `/sekkei:mockup` command.",
    "",
    "YAML format:",
    "```yaml",
    "layout_type: form   # form | dashboard | list | detail | modal | wizard",
    "shell_type: admin   # admin | auth | onboarding | public | error | email | print | blank (auto-detected from function ID, override here)",
    "viewport: desktop   # desktop | tablet | mobile",
    "regions:",
    "  header:",
    "    components:",
    "      - {n: 1, type: logo, label: \"ロゴ\"}",
    "      - {n: 2, type: nav, label: \"ナビゲーション\"}",
    "  main:",
    "    components:",
    "      - {n: 3, type: text-input, label: \"フィールド名\", required: true}",
    "      - {n: 4, type: button, label: \"送信\", variant: primary}",
    "  footer:",
    "    components:",
    "      - {n: 5, type: text, label: \"フッターテキスト\"}",
    "```",
    "",
    "Rules:",
    "- `n` values must be sequential (1, 2, 3...) and unique across regions",
    "- Component types: text-input, password-input, textarea, select, checkbox, radio, button, link, table, card, nav, logo, text, search-bar, tabs, pagination",
    "- `variant` for buttons: primary, secondary, danger",
    "- `required: true` marks mandatory fields (shows ※ in rendered mockup)",
    "- `shell_type` is auto-detected from function ID prefix (F-AUTH→auth, F-ONB→onboarding, F-PUB/F-LP→public, F-ERR→error, F-MAIL/F-EMAIL→email, F-PRINT→print); set explicitly only to override",
    "- Do NOT use ASCII art for screen layouts — always use this YAML format",
  ].join("\n");
}

/**
 * Build screen design generation instruction for split-mode basic-design.
 * Instructs AI to generate a dedicated screen-design.md with 6 standard sections.
 * Called by SKILL.md; prepended to input_content for the generation call.
 */
export function buildScreenDesignInstruction(featureId: string, language = "ja"): string {
  const h = SECTION_HEADINGS[language] ?? SECTION_HEADINGS.ja;
  const t = TABLE_HEADERS[language] ?? TABLE_HEADERS.ja;
  const docTitle = language === "ja" ? "画面設計書" : language === "vi" ? "Thiết kế Màn hình" : "Screen Design Document";

  return [
    `## Screen Design Document Instructions`,
    ``,
    `Generate a ${docTitle} for feature **${featureId}**.`,
    `This document is SEPARATE from the feature's basic-design.md.`,
    ``,
    `### Required Structure`,
    ``,
    `# ${docTitle} — {Screen Name} (SCR-${featureId}-001)`,
    ``,
    `Repeat the following 6 sections for EACH screen belonging to this feature.`,
    `Use sequential IDs: SCR-${featureId}-001, SCR-${featureId}-002, etc.`,
    ``,
    `## 1. ${h[0]}`,
    `Provide a structured YAML layout block inside a \`\`\`yaml code fence.`,
    `This YAML describes the layout structure. For visual HTML mockups, run \`/sekkei:mockup\` after completing screen-design.`,
    ``,
    `### YAML Layout Format`,
    `\`\`\`yaml`,
    `layout_type: form   # form | dashboard | list | detail | modal | wizard`,
    `shell_type: admin   # admin | auth | onboarding | public | error | email | print | blank (auto-detected from function ID, override here)`,
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
    `- \`n\` numbers correspond to the # column in the ${h[1]} table (section 2)`,
    `- Use appropriate component types: text-input, password-input, textarea, select, checkbox, radio, button, link, table, card, nav, logo, text, search-bar, tabs, pagination`,
    `- \`variant\` for buttons: primary, secondary, danger`,
    `- \`required: true\` marks mandatory fields (shows ※ in mockup)`,
    ``,
    `## 2. ${h[1]}`,
    `Table format: ${t.items}`,
    `- The \`#\` column uses circled numbers ①②③ matching the YAML \`n\` values in section 1`,
    `- Type: text / number / date / select / checkbox / textarea / file / hidden`,
    `- Required: ○ (required) or blank (optional)`,
    ``,
    `## 3. ${h[2]}`,
    `Table format: ${t.validation}`,
    `- Timing: onBlur / onSubmit / onChange`,
    ``,
    `## 4. ${h[3]}`,
    `Table format: ${t.events}`,
    ``,
    `## 5. ${h[4]}`,
    `Table format: ${t.transition}`,
    `Reference SCR-${featureId}-xxx IDs for source/destination screens.`,
    ``,
    `## 6. ${h[5]}`,
    `Table format: ${t.permissions}`,
    `- Cell values: ○ (permitted) / × (denied) / - (not applicable)`,
    ``,
    `### ID Rules`,
    `- Screen IDs: SCR-${featureId}-001, SCR-${featureId}-002, ...`,
    `- Field IDs within a screen: ${featureId}-FLD-001, ${featureId}-FLD-002, ...`,
    `- Cross-reference basic-design.md SCR-xxx IDs if upstream provided`,
    ``,
    `### Constraints`,
    `- Generate specs for ALL screens identified in the feature input`,
    `- Do NOT include system-architecture, DB design, or shared sections — those are in shared/`,
    `- Every screen must have entries in all 6 sections (use N/A rows if not applicable)`,
    ``,
    `### HTML Mockups`,
    `After generating screen-design.md, run \`/sekkei:mockup\` to generate interactive HTML mockups with numbered annotations matching the # column in section 2.`,
  ].join("\n");
}
