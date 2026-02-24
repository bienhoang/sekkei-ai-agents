# Phase 2: Wireframe Templates (HTML/CSS)

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-mockup-schema-and-parser.md)
- Brainstorm CSS specs: [brainstorm report](../reports/brainstorm-260221-2205-visual-mockup-renderer.md)

## Overview
- **Priority:** High (blocks Phase 3 renderer)
- **Status:** pending
- **Effort:** 1.5h
- **Description:** Create Handlebars HTML templates + CSS for mid-fidelity blueprint wireframes with numbered annotations

## Key Insights
- Handlebars already in root `package.json` — need to add to mcp-server deps
- Each layout type (form, dashboard, list, etc.) has a different HTML structure
- Phase 2 implements `form` template only; other types added later
- Components rendered as reusable Handlebars partials
- Red circled numbers ①②③ via CSS `position: absolute` on each component
- Google Fonts Noto Sans JP loaded via `<link>` tag (Playwright has network access)

## Requirements

### Functional
- `blueprint.css` — shared mid-fidelity wireframe styling
- `components.hbs` — Handlebars partial for all component types (input, button, select, etc.)
- `form.hbs` — form layout template (header + centered form + footer)
- `buildHtml(layout: ScreenLayout): string` — function that compiles template + data → full HTML string

### Non-Functional
- CSS looks professional: gray borders, white bg, subtle shadows, clear typography
- Circled numbers clearly visible, red background, white text
- Japanese text renders correctly via Noto Sans JP
- HTML is self-contained (inline CSS or `<style>` block) for Playwright screenshot

## Architecture

```
ScreenLayout (from Phase 1)
    ↓
buildHtml(layout)
    ↓ selects template by layout_type
    ↓ registers component partials
    ↓ compiles with Handlebars
Full HTML string (self-contained with <style>)
    ↓ (consumed by Phase 3 Playwright renderer)
```

## Related Code Files

### New Files
| File | Purpose | LOC Est |
|------|---------|---------|
| `templates/wireframe/blueprint.css` | Shared CSS for mid-fidelity blueprint style | ~120 |
| `templates/wireframe/form.hbs` | Handlebars template for form layout | ~60 |
| `mcp-server/src/lib/mockup-html-builder.ts` | Compile Handlebars templates → HTML string | ~100 |

### Reference Files
| File | Why |
|------|-----|
| `mcp-server/src/lib/mockup-schema.ts` (Phase 1) | `ScreenLayout` type for template context |
| `mcp-server/package.json` | Add `handlebars` dependency |

## Implementation Steps

1. **Add handlebars to mcp-server**: `npm install handlebars` in mcp-server/
   - Note: handlebars is already in root package.json but mcp-server needs its own dep

2. **Create `templates/wireframe/blueprint.css`**:
   ```css
   /* Core layout */
   * { box-sizing: border-box; margin: 0; padding: 0; }
   body { background: #f5f6f8; font-family: 'Noto Sans JP', system-ui, sans-serif; }
   .wireframe { max-width: var(--viewport-width, 1024px); margin: 24px auto; padding: 24px; }

   /* Regions */
   .region { background: white; border: 1.5px solid #dee2e6; border-radius: 6px; padding: 16px; margin-bottom: 12px; }
   .region-header { display: flex; align-items: center; justify-content: space-between; }
   .region-main { /* flex column for form, grid for dashboard */ }
   .region-footer { text-align: center; color: #868e96; font-size: 13px; }

   /* Components */
   .component { position: relative; margin-bottom: 10px; }
   .input-field { display: block; width: 100%; padding: 8px 12px; border: 1.5px solid #ced4da; border-radius: 4px; background: #f8f9fa; font-size: 14px; color: #495057; }
   .input-label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500; color: #495057; }
   .required-mark { color: #e03131; margin-left: 2px; }
   .btn { padding: 8px 20px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; }
   .btn-primary { background: #4263eb; color: white; }
   .btn-secondary { background: #e9ecef; color: #495057; border: 1.5px solid #ced4da; }
   .btn-danger { background: #e03131; color: white; }
   .link { color: #4263eb; text-decoration: underline; font-size: 13px; }
   .checkbox-wrap { display: flex; align-items: center; gap: 8px; font-size: 14px; }
   .select-field { /* same as input-field + dropdown arrow */ }
   .nav-bar { display: flex; align-items: center; gap: 16px; padding: 8px 16px; }
   .logo { font-weight: 700; font-size: 18px; color: #212529; }
   .table-placeholder { border: 1.5px dashed #adb5bd; border-radius: 4px; padding: 24px; text-align: center; color: #868e96; }

   /* Annotation circles */
   .annotation {
     position: absolute; top: -10px; right: -10px; z-index: 10;
     width: 22px; height: 22px; background: #e03131;
     color: white; border-radius: 50%; font-size: 11px; font-weight: 700;
     display: flex; align-items: center; justify-content: center;
     box-shadow: 0 1px 3px rgba(0,0,0,0.3);
   }

   /* Form-specific */
   .form-container { max-width: 480px; margin: 0 auto; }
   .form-title { font-size: 20px; font-weight: 600; text-align: center; margin-bottom: 20px; color: #212529; }
   ```

3. **Create `templates/wireframe/form.hbs`**:
   - Full HTML document with `<head>` (Google Fonts link, inline `<style>` from blueprint.css)
   - Viewport meta tag set to layout's viewport width
   - Render regions: header → main (as centered form) → footer
   - Each component rendered based on `type` using `{{#if}}` blocks or helper
   - Each component wrapped in `.component` div with `.annotation` span showing `n`

4. **Create `mcp-server/src/lib/mockup-html-builder.ts`**:
   - `loadCss(): string` — reads `blueprint.css` from templates/wireframe/
   - `loadTemplate(layoutType: string): string` — reads `.hbs` from templates/wireframe/
   - `buildMockupHtml(layout: ScreenLayout): string` — main entry:
     a. Load CSS and template
     b. Register Handlebars helpers: `eq` (equality check), `circledNumber` (convert n → ①②③...)
     c. Compile template with `{ ...layout, css: loadCss() }`
     d. Return full HTML string
   - `circledNumber(n: number): string` — maps 1→①, 2→②, etc. using Unicode chars U+2460-U+2473 (①-⑳)
   - Viewport width map: desktop=1024, tablet=768, mobile=375

## Todo List
- [ ] Add `handlebars` to mcp-server package.json
- [ ] Create `blueprint.css` with mid-fidelity wireframe styles
- [ ] Create `form.hbs` Handlebars template
- [ ] Create `mockup-html-builder.ts` with `buildMockupHtml()`
- [ ] Verify HTML output is self-contained (no external deps except Google Fonts)
- [ ] Compile check passes

## Success Criteria
- `buildMockupHtml()` returns valid HTML for form layout
- CSS produces mid-fidelity blueprint look (gray borders, white bg, clear hierarchy)
- Red circled numbers visible at top-right of each component
- Japanese labels render correctly
- HTML is self-contained (works in Playwright without file serving)

## Risk Assessment
- **Google Fonts slow/unavailable**: Fallback to system-ui in font-family stack
- **Handlebars too limited for complex layouts**: Can use helpers for conditional rendering; dashboard/list templates in future phases may need more complex helpers
- **CSS rendering differs across browsers**: Playwright uses Chromium by default, consistent

## Security Considerations
- No user input directly in HTML — all values come from validated Zod schema
- Handlebars auto-escapes HTML entities by default (prevents XSS in labels)

## Next Steps
- Phase 3 takes HTML string from `buildMockupHtml()` and screenshots it with Playwright
- Future: add `dashboard.hbs`, `list.hbs`, `detail.hbs`, `modal.hbs`, `wizard.hbs`
