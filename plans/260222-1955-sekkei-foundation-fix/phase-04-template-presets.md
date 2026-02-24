# Phase 04: 3 Template Presets (Enterprise / Standard / Agile)

## Context Links

- Research: [researcher-02-jp-si-standards.md](./research/researcher-02-jp-si-standards.md) §4
- Brainstorm: [brainstorm-260222-1955-sekkei-improvements.md](../reports/brainstorm-260222-1955-sekkei-improvements.md) §B1
- Phase 01: [phase-01-init-wizard.md](./phase-01-init-wizard.md) — preset selection in wizard
- Existing templates: `sekkei/packages/mcp-server/templates/ja/` (11 files)
- Template loader: `sekkei/packages/mcp-server/src/lib/template-loader.ts`
- Template resolver: `sekkei/packages/mcp-server/src/lib/template-resolver.ts`
- Types: `sekkei/packages/mcp-server/src/types/documents.ts` (`KeigoLevel`, `ProjectConfig`)

---

## Overview

- **Priority:** P1 — BrSE/PM don't customize templates; they want "give me what Company X expects"
- **Status:** pending
- **Description:** Create 3 preset YAML configs + per-preset template section overrides in `templates/presets/`. Integrate preset resolution into `template-resolver.ts`. Preset selected via `sekkei.config.yaml` field `project.preset` (set by init wizard in Phase 01).

---

## Key Insights

From researcher-02 (JP SI Standards):
- **Enterprise (大手SI/官公庁):** 丁寧語 all docs, A版 versioning, mandatory F/REQ/SCR IDs, 10-15 sections, full approval table on cover page, 備考 column in all tables
- **Standard (中堅SI/SES):** 丁寧語 in requirements; 常体 in design docs; 6-10 sections; numeric 0.x/1.x versioning; condensed test cases
- **Agile (アジャイル/スタートアップ):** 常体 throughout; 3-6 sections; Mermaid diagrams preferred; BDD-style test cases; no rigid approval table; numeric versioning or Git tags

Key differentiators BrSE/PM notice: cover page depth, keigo level, section count, ID scheme, 改版管理表 presence.

Preset resolution strategy: preset config acts as a **diff** against default templates, not full replacement. Only sections that differ between presets need to be stored; resolver merges preset overrides onto base template.

---

## Requirements

### Functional
- 3 presets: `enterprise`, `standard`, `agile`
- Each preset defines:
  - `keigo_level` — overrides `project.keigo` default
  - `version_scheme` — `"alphabetic"` (A版) or `"numeric"` (0.x/1.x)
  - `required_ids` — whether F-xxx/REQ-xxx IDs are mandatory
  - `cover_page` — `"full"` (approval table) | `"simple"` | `"minimal"`
  - `section_density` — `"full"` | `"core"` | `"minimal"`
  - Per-doc-type section list overrides
- `template-resolver.ts` reads `project.preset` from project config; applies preset overrides
- Preset YAML files co-located in `templates/presets/{name}.yaml`
- Fallback: if no preset specified, use existing default templates unchanged (backward compat)
- `get_template` MCP tool should pass preset context so returned template reflects preset

### Non-functional
- No duplication of full template content — preset files store diffs only
- Must not break existing tests (default template resolution path unchanged)

---

## Architecture

```
templates/
├── ja/                          (existing 11 templates — unchanged)
│   ├── basic-design.md
│   ├── requirements.md
│   └── ...
└── presets/
    ├── enterprise.yaml          (preset config + section overrides)
    ├── standard.yaml
    └── agile.yaml

src/lib/
├── template-resolver.ts         (MODIFIED: add preset resolution step)
├── template-loader.ts           (MODIFIED: pass preset from project config)
└── preset-resolver.ts           (NEW: loads + merges preset onto base template)
```

### Preset YAML Format

```yaml
# templates/presets/enterprise.yaml
name: enterprise
label: "大手SI / 官公庁向け"
keigo_level: "丁寧語"
version_scheme: alphabetic    # A版, B版
cover_page: full               # includes 承認欄 table with 作成者/レビュアー/承認者
required_ids: true             # F-xxx, REQ-xxx mandatory
section_density: full          # all sections from researcher-02

# Per-doc-type section additions (merged on top of base template sections)
doc_overrides:
  requirements:
    additional_sections:
      - "改版管理表"
      - "承認欄"
      - "配布先リスト"
    notes: "全セクション必須。ID体系(REQ-xxx)必須"
  basic-design:
    additional_sections:
      - "非機能要件"
      - "帳票設計書"
      - "バッチ設計図"
    notes: "サブシステム単位で分割推奨"
  test-spec:
    additional_sections:
      - "テスト結果まとめ"
      - "不具合管理表"
    notes: "実施結果・担当者サインオフ列必須"
```

```yaml
# templates/presets/standard.yaml
name: standard
label: "中堅SI / SES向け"
keigo_level: "mixed"           # 丁寧語 for requirements; 常体 for design
version_scheme: numeric        # 0.x draft, 1.x approved
cover_page: simple
required_ids: false
section_density: core

doc_overrides:
  requirements:
    notes: "非機能要件は簡略化可"
  test-spec:
    notes: "テスト結果と統合可"
```

```yaml
# templates/presets/agile.yaml
name: agile
label: "アジャイル / スタートアップ向け"
keigo_level: "simple"          # 常体
version_scheme: numeric
cover_page: minimal
required_ids: false
section_density: minimal

doc_overrides:
  basic-design:
    skip_sections:
      - "帳票設計書"
      - "バッチ設計図"
    notes: "Mermaid図推奨。外部設計と内部設計を1ファイルに統合可"
  test-spec:
    notes: "BDDスタイル(Given/When/Then)可。ユーザーストーリーにリンク"
```

### Resolution Flow

```
resolveTemplatePath(docType, lang, preset?)
  1. Load base template: templates/ja/{doc-type}.md  (existing)
  2. If preset provided:
     a. Load templates/presets/{preset}.yaml
     b. Apply doc_overrides[docType].additional_sections → append to template
     c. Apply skip_sections → remove from template (comment out with <!-- -->)
     d. Apply notes → append as <!-- preset: {notes} --> comment (non-visible in rendered)
  3. Return modified template string
```

---

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/src/lib/template-resolver.ts` — add optional `preset` param to `resolveTemplatePath()`; call `preset-resolver.ts` when preset provided
- `sekkei/packages/mcp-server/src/lib/template-loader.ts` — pass `project.preset` from config to resolver
- `sekkei/packages/mcp-server/src/types/documents.ts` — add `PRESETS` const and `Preset` type; add `preset?` field to `ProjectConfig.project`

### Create
- `sekkei/packages/mcp-server/src/lib/preset-resolver.ts` — loads preset YAML; merges onto base template (≤150 lines)
- `sekkei/packages/mcp-server/templates/presets/enterprise.yaml`
- `sekkei/packages/mcp-server/templates/presets/standard.yaml`
- `sekkei/packages/mcp-server/templates/presets/agile.yaml`

---

## Implementation Steps

1. **Add `PRESETS` to `types/documents.ts`:**
   ```ts
   export const PRESETS = ["enterprise", "standard", "agile"] as const;
   export type Preset = typeof PRESETS[number];
   ```
   Add `preset?: Preset` to `ProjectConfig.project`.

2. **Create preset YAML files** in `templates/presets/`:
   - `enterprise.yaml` — full spec per research report §4
   - `standard.yaml`
   - `agile.yaml`

3. **Create `src/lib/preset-resolver.ts`:**
   ```ts
   export interface PresetConfig { ... }  // mirrors YAML schema
   export async function loadPreset(presetsDir: string, preset: Preset): Promise<PresetConfig>
   export function applyPreset(baseTemplate: string, docType: DocType, preset: PresetConfig): string
   ```
   - `loadPreset`: read + parse `{presetsDir}/{preset}.yaml` via `yaml` package
   - `applyPreset`: append `additional_sections` headings to template body; remove `skip_sections` (mark with HTML comment); append notes comment

4. **Update `template-resolver.ts`:** add optional `preset?: Preset` param to `resolveTemplatePath()`; if preset provided, load base template content, call `applyPreset()`, return modified string

5. **Update `template-loader.ts`:** read `sekkei.config.yaml` `project.preset` field; pass to `resolveTemplatePath()`

6. **Update `config.ts`:** add `preset?: Preset` to `ServerConfig`; read from `sekkei.config.yaml` via project config load if available

7. **`npm run lint`** — verify no TS errors

8. **Write tests** for `preset-resolver.ts`:
   - `loadPreset("enterprise")` returns correct structure
   - `applyPreset` with `additional_sections` appends headings
   - `applyPreset` with `skip_sections` comments out sections
   - Default (no preset) path: base template returned unchanged

---

## Todo List

- [ ] Add `PRESETS` type + `preset?` field to `types/documents.ts`
- [ ] Create `templates/presets/enterprise.yaml`
- [ ] Create `templates/presets/standard.yaml`
- [ ] Create `templates/presets/agile.yaml`
- [ ] Create `src/lib/preset-resolver.ts` (`loadPreset` + `applyPreset`)
- [ ] Update `template-resolver.ts` — optional preset param
- [ ] Update `template-loader.ts` — pass preset from config
- [ ] `npm run lint` passes
- [ ] Write unit tests for `preset-resolver.ts`
- [ ] `npm test` — 142 existing tests still pass

---

## Success Criteria

- `get_template` with enterprise preset returns template with 承認欄, 改版管理表, 配布先リスト sections
- `get_template` with agile preset returns template without 帳票設計書, バッチ設計図
- No preset → identical output to current behavior (no regression)
- Preset YAML files are valid YAML parseable by `yaml` package
- New unit tests pass

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Template modification via `applyPreset` breaks validator section checks in `validator.ts` | Medium | Validator checks for sections present in doc content (not template); preset sections only added to prompt, not enforced until doc generated |
| Preset YAML schema evolves — old configs break | Low | Version field in preset YAML; migration notes in changelog |
| `skip_sections` HTML comment approach leaves orphaned headings | Low | Test with real templates; ensure comment wraps entire section including body |

---

## Security Considerations

- Preset files loaded from whitelisted `templates/presets/` dir only — no user-controlled path
- Path containment validation applies to `presetsDir` same as `SEKKEI_TEMPLATE_OVERRIDE_DIR` pattern in `template-resolver.ts`

---

## Next Steps

- Phase 01 (init wizard): preset prompt options come from `PRESETS` const exported from `types/documents.ts`
- Phase 05 (keigo validation): expected keigo per doc-type is now also preset-dependent (enterprise → 丁寧語 even for design docs; agile → 常体 all)
- Phase 06 (lifecycle): preset `version_scheme` field informs default version format in frontmatter
