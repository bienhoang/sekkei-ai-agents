# Translate Architecture Analysis

> How `/sekkei:translate` works: flow, glossary integration, split-doc handling, output storage, and proposed improvements.

## 1. Architecture Overview

```
/sekkei:translate @doc --lang=en
  │
  ├─ Skill Layer (utilities.md) ─── orchestration
  │   ├─ Read source document
  │   ├─ Check for _index.yaml manifest (split vs monolithic)
  │   ├─ Load glossary from workspace-docs/glossary.yaml
  │   └─ Loop: call MCP tool per file (split) or once (monolithic)
  │
  ├─ MCP Tool (translate_document) ─── context preparation
  │   ├─ Load glossary YAML if path provided
  │   ├─ Format glossary terms as mapping lines
  │   ├─ Build translation instructions
  │   └─ Return: context + glossary + raw content (NO actual translation)
  │
  ├─ Skill Layer (Claude AI) ─── actual translation
  │   ├─ Use returned context to translate
  │   ├─ Preserve Markdown, tables, ID references
  │   └─ Output translated content
  │
  └─ Skill Layer ─── save output
      ├─ Monolithic: workspace-docs/{doc-type}.{target_lang}.md
      └─ Split: translations/{lang}/shared/ + features/{id}/
```

**Key design decision**: MCP tool is deterministic (no AI). Translation is done by Claude at the skill layer. This keeps MCP server free of LLM dependencies.

## 2. Key Files

| Component | Path | LOC | Role |
|-----------|------|-----|------|
| MCP Tool | `packages/mcp-server/src/tools/translate.ts` | 76 | Prepare translation context + glossary |
| Skill Flow | `packages/skills/content/references/utilities.md` | — | Orchestration steps for both monolithic + split |
| Glossary Loader | `packages/mcp-server/src/lib/glossary-native.ts` | 155 | Load/save/search/export/import glossary terms |
| Manifest Manager | `packages/mcp-server/src/lib/manifest-manager.ts` | 144 | Split doc manifest CRUD + translation manifest creation |
| Types | `packages/mcp-server/src/types/documents.ts` | — | `Manifest.translations[]`, `GlossaryTerm` |
| Manifest Schema | `packages/mcp-server/src/types/manifest-schemas.ts` | — | Zod validation for `translations[].lang/manifest` |
| Tests | `packages/mcp-server/tests/unit/translate-tool.test.ts` | 65 | 4 basic tests |

## 3. MCP Tool: `translate_document`

### Input Schema (Zod)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `content` | string (max 500K) | required | Document content to translate |
| `source_lang` | regex `^[a-z]{2,3}(-[A-Z]{2})?$` | `"ja"` | Source language code |
| `target_lang` | same regex | required | Target language code |
| `glossary_path` | string? | — | Path to glossary.yaml |

### Output

Returns a single text block with:
1. Translation context header (source/target langs)
2. Glossary section (if glossary loaded) — list of term mappings
3. Translation instructions (preserve formatting, IDs, tables)
4. Raw content to translate

### Glossary Term Format

```
GlossaryTerm { ja: string, en: string, vi?: string, context?: string }
```

Currently outputs: `{ja} → {en} ({context})` — **ignores target language and `vi` field**.

## 4. Split Document Translation

### Flow

```
_index.yaml (source)
  ├─ shared/
  │   ├─ 00-overview.md        → translations/{lang}/shared/00-overview.md
  │   └─ 01-system-context.md  → translations/{lang}/shared/01-system-context.md
  └─ features/
      ├─ user-auth/            → translations/{lang}/features/user-auth/
      └─ payment/              → translations/{lang}/features/payment/
```

### Manifest Integration

- `manifest-manager.ts` provides `createTranslationManifest()` — mirrors source structure with target language
- `addTranslation()` — adds `translations[{lang, manifest}]` entry to source `_index.yaml`
- Translation manifest at `translations/{lang}/_index.yaml`

### Types

```ts
interface Manifest {
  version: string;
  project: string;
  language: Language;
  documents: Record<string, ManifestDocument>;
  translations?: { lang: string; manifest: string }[];
  source_language?: Language;
}
```

## 5. Known Bugs

### BUG-1: Glossary ignores target language (Critical)

**Location**: `translate.ts:31-33`

```ts
// Always outputs ja → en, even when target is vi
glossaryTerms = terms.map(
  (t) => `${t.ja} → ${t.en}${t.context ? ` (${t.context})` : ""}`
);
```

**Impact**: Translating ja→vi shows English terms. Vietnamese glossary field unused.

**Fix**: Select glossary target field based on `target_lang`:
```ts
const targetField = target_lang.startsWith("vi") ? "vi" : "en";
glossaryTerms = terms
  .filter(t => t[targetField])
  .map(t => `${t.ja} → ${t[targetField]} (${t.context ?? ""})`);
```

### BUG-2: No reverse-direction glossary

**Impact**: Translating en→ja or vi→ja shows `ja → en` — backwards mapping.

**Fix**: Use `source_lang` to determine source field, `target_lang` for target field.

## 6. Proposed Improvements

### Phase 1: Fix Glossary Mapping (Low effort, high impact)

- Bidirectional glossary based on `source_lang` / `target_lang`
- Language field resolution: `ja`→`ja`, `en`→`en`, `vi`→`vi`, fallback to `en`
- Add `zh` field to `GlossaryTerm` for future Chinese support
- Update tests for vi/en/reverse scenarios

### Phase 2: Post-Translation Validation (Medium effort)

- New function in `validator.ts` or standalone `translation-validator.ts`
- Checks:
  - ID reference preservation (reuse `id-extractor.ts`)
  - Table row count matching
  - Heading structure parity
  - Markdown formatting integrity
- Returns warnings (not errors) — AI translation may legitimately restructure

### Phase 3: Incremental Translation (Medium effort)

- Hash-based section tracking via `<!-- sekkei:translated:{section-hash} -->` comments
- On retranslation: compare section hashes, skip unchanged
- Preserves human edits in unchanged sections
- New module: `translation-tracker.ts`
- Leverages `analyze_update` MCP tool for change detection

### Phase 4: Batch Chain Translation (Low effort, skill-only)

- `/sekkei:translate --all --lang=en` — translates entire V-model chain
- Reads `sekkei.config.yaml` for `complete` documents
- Sequential processing with progress summary
- Skill-layer change only (no MCP changes needed)

## 7. Test Coverage

### Current (4 tests)

- Tool registration
- Basic ja→en translation context
- ja→vi without glossary
- Missing glossary path handling

### Missing tests

- Glossary with Vietnamese terms (BUG-1 scenario)
- Reverse translation (en→ja)
- Split document translation manifest creation
- Large document handling (near 500K limit)
- Post-translation validation (Phase 2)
