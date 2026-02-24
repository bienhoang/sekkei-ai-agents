# Phase 1: Mockup Schema & YAML Parser

## Context Links
- Parent: [plan.md](./plan.md)
- Brainstorm: [brainstorm report](../reports/brainstorm-260221-2205-visual-mockup-renderer.md)
- Existing patterns: `mcp-server/src/lib/errors.ts`, `mcp-server/src/types/documents.ts`

## Overview
- **Priority:** High (blocks all other phases)
- **Status:** pending
- **Effort:** 1h
- **Description:** Define Zod schema for YAML layout blocks + parser to extract YAML from markdown

## Key Insights
- AI generates YAML code block inside `## 1. 画面レイアウト` section
- YAML must be validated before rendering (invalid YAML = clear error, not crash)
- Schema must support 6 layout types but Phase 1 only validates `form`
- Component `n` property (annotation number) must be unique per screen

## Requirements

### Functional
- Zod schema for screen layout YAML (layout_type, viewport, regions, components)
- Component schema with `n` (number), `type`, `label`, optional `required`/`variant`
- Parser to extract YAML code block from markdown section 1
- Validation with clear SekkeiError messages on failure

### Non-Functional
- ESM with `.js` import extensions
- Under 200 LOC per file
- Reuse SekkeiError codes

## Architecture

```
screen-design.md (markdown with YAML block)
    ↓
parseScreenLayout(markdown: string): ScreenLayout
    ↓ extracts ```yaml...``` from section 1
    ↓ parses YAML string → object
    ↓ validates against Zod schema
ScreenLayout (typed object)
```

## Related Code Files

### New Files
| File | Purpose | LOC Est |
|------|---------|---------|
| `mcp-server/src/lib/mockup-schema.ts` | Zod schemas + TypeScript types | ~80 |
| `mcp-server/src/lib/mockup-parser.ts` | Extract YAML from markdown + validate | ~70 |

### Reference Files
| File | Why |
|------|-----|
| `mcp-server/src/lib/errors.ts` | SekkeiError pattern — add `MOCKUP_ERROR` code |
| `mcp-server/src/types/documents.ts` | Pattern for Zod enum definitions |

## Implementation Steps

1. **Add error code** to `errors.ts`: add `"MOCKUP_ERROR"` to `SekkeiErrorCode` union
2. **Create `mockup-schema.ts`**:
   - Define `ComponentType` Zod enum: `text-input`, `password-input`, `textarea`, `select`, `checkbox`, `radio`, `button`, `link`, `table`, `card`, `nav`, `sidebar`, `search-bar`, `pagination`, `image-placeholder`, `logo`, `text`, `icon-button`, `number-input`, `date-input`, `toggle`, `breadcrumb`, `tabs`, `stat-card`, `chart-placeholder`, `badge`, `avatar`, `alert`
   - Define `LayoutType` Zod enum: `form`, `dashboard`, `list`, `detail`, `modal`, `wizard`
   - Define `Viewport` Zod enum: `desktop`, `tablet`, `mobile`
   - Define `ButtonVariant` Zod enum: `primary`, `secondary`, `danger`
   - Define `ComponentSchema`: `{ n: z.number().int().positive(), type: ComponentType, label: z.string(), required: z.boolean().optional(), variant: ButtonVariant.optional(), width: z.string().optional() }`
   - Define `RegionSchema`: `{ style: z.string().optional(), width: z.string().optional(), components: z.array(ComponentSchema) }`
   - Define `ScreenLayoutSchema`: `{ layout_type: LayoutType, viewport: Viewport.default("desktop"), screen_id: z.string().optional(), screen_name: z.string().optional(), regions: z.record(z.string(), RegionSchema) }`
   - Export inferred types: `ScreenLayout`, `ScreenComponent`, `ScreenRegion`
   - Add refinement: all `n` values must be unique across all regions

3. **Create `mockup-parser.ts`**:
   - `extractLayoutYaml(markdown: string): string | null` — regex to find ````yaml` block after `## 1.` heading
   - `parseScreenLayout(markdown: string): ScreenLayout` — extract + parse YAML + validate with Zod
   - `parseScreenLayouts(markdown: string): ScreenLayout[]` — handle multiple screens in one file (each has its own `## 1.` section under a screen heading)
   - Throw `SekkeiError("MOCKUP_ERROR", ...)` on validation failure with details of what's wrong

4. **Compile check**: run `npm run lint` from mcp-server/

## Todo List
- [ ] Add `MOCKUP_ERROR` to SekkeiErrorCode
- [ ] Create `mockup-schema.ts` with Zod schemas
- [ ] Create `mockup-parser.ts` with YAML extraction + validation
- [ ] Compile check passes

## Success Criteria
- `parseScreenLayout()` correctly extracts and validates YAML from markdown
- Invalid YAML throws SekkeiError with clear message
- Duplicate `n` values caught by refinement
- All types exported and usable by Phase 2/3
- `npm run lint` passes

## Risk Assessment
- **AI generates unexpected YAML structure**: Mitigate with `.passthrough()` on schema for forward compat
- **Multiple screens in one file**: Parser handles repeated sections via `parseScreenLayouts()`

## Security Considerations
- YAML parsing uses `yaml` package (already dep) — safe against prototype pollution
- No user file paths involved in this phase

## Next Steps
- Phase 2 uses `ScreenLayout` type to build Handlebars template context
- Phase 3 uses `parseScreenLayout()` to extract data before rendering
