# Phase 02 — VitePress Base Theme + Japanese Layout

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: [phase-01](./phase-01-create-sekkei-preview-package.md) (package structure)
- Research: [Milkdown + VitePress](./research/researcher-01-milkdown-vitepress.md)
- Docs: [code-standards.md](/docs/code-standards.md)

## Overview

- **Date**: 2026-02-21
- **Priority**: P1 (blocks phase-04, phase-05)
- **Status**: pending
- **Effort**: 2h
- **Description**: Create VitePress custom theme under `sekkei/packages/sekkei-preview/theme/`. Extends VitePress default theme with JP-friendly typography, auto-sidebar from numbered directory structure, and sekkei branding.

## Key Insights

- Sekkei output uses numbered dirs: `01-overview.md`, `03-system/`, `05-features/`
- Sidebar must auto-generate from this structure, respecting sort order
- Japanese text needs: `font-family` with Noto Sans JP / system CJK fallbacks, wider line-height
- VitePress default theme is extensible via `enhanceApp` + `Layout` slot overrides
- Theme files are Vue SFCs — processed by Vite, NOT by tsc

## Requirements

### Functional
- FR-01: Sidebar auto-generated from docs directory structure (numbered sort)
- FR-02: Japanese-friendly typography (CJK font stack, 1.8 line-height)
- FR-03: Navigation reflects sekkei V-model doc chain order
- FR-04: Feature directories (`05-features/<name>/`) become collapsible sidebar groups
- FR-05: Title derived from markdown frontmatter `title` or first H1
- FR-06: Sekkei branding (title: "Sekkei Docs" or project name from config)

### Non-Functional
- NFR-01: Theme extends DefaultTheme (no full rewrite)
- NFR-02: Mobile-responsive (VitePress default handles this)
- NFR-03: Dark mode support (VitePress default)

## Architecture

```
sekkei/packages/sekkei-preview/theme/
├── index.ts              # Theme entry — extends DefaultTheme
├── styles/
│   └── custom.css        # JP typography, CJK overrides
└── composables/
    └── use-sidebar.ts    # Auto-sidebar from directory structure
```

### Sidebar Generation Logic

```
Input: docs dir listing
  01-overview.md        → "概要" (from frontmatter title)
  02-requirements.md    → "要件定義書"
  03-system/            → group "システム設計"
    architecture.md     →   "アーキテクチャ"
    database.md         →   "データベース設計"
  04-functions-list.md  → "機能一覧"
  05-features/          → group "機能別設計"
    auth/               →   sub-group "認証"
      basic-design.md   →     "基本設計書"
      detail-design.md  →     "詳細設計書"

Output: VitePress sidebar config
```

## Related Code Files

### Create
- `sekkei/packages/sekkei-preview/theme/index.ts`
- `sekkei/packages/sekkei-preview/theme/styles/custom.css`
- `sekkei/packages/sekkei-preview/theme/composables/use-sidebar.ts`

### Modify
- `sekkei/packages/sekkei-preview/src/generate-config.ts` (reference theme path)

### Delete
- None

## Implementation Steps

1. Create `theme/index.ts`:
   ```typescript
   import DefaultTheme from 'vitepress/theme'
   import './styles/custom.css'
   export default { ...DefaultTheme }
   ```
2. Create `theme/styles/custom.css` with JP typography:
   - Font stack: `'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif`
   - `line-height: 1.8` for body text (JP readability)
   - Table styling: borders, padding for spec tables
   - Code block: `font-family: 'JetBrains Mono', 'Source Code Pro', monospace`
   - Override VitePress CSS variables: `--vp-font-family-base`, `--vp-font-family-mono`
   - Wider content area for tables: `--vp-layout-max-width: 1440px`
3. Create `theme/composables/use-sidebar.ts`:
   - Export `buildSidebar(docsDir: string): SidebarItem[]`
   - Read directory entries recursively
   - Sort by numbered prefix (01-, 02-, etc.)
   - For `.md` files: extract title from YAML frontmatter or first H1
   - For directories: create collapsible group, recurse into children
   - Skip: `index.md` (homepage), `.vitepress/`, `node_modules/`
   - Map numbered prefix to display: strip number prefix from link
   - Handle feature dirs specially: `05-features/<name>/` → named group
4. Update `src/generate-config.ts` to:
   - Import sidebar builder
   - Call `buildSidebar(docsDir)` at config generation time
   - Embed sidebar result as JSON in generated `config.mts`
   - Set `themeConfig.sidebar` and `themeConfig.nav`
   - Reference theme path: `theme: path.resolve(packageDir, 'theme')`
5. Verify theme renders correctly with sample docs

## Todo List

- [ ] Create theme/index.ts extending DefaultTheme
- [ ] Create theme/styles/custom.css with JP typography
- [ ] Implement use-sidebar.ts with numbered dir sorting
- [ ] Update generate-config.ts to use sidebar builder
- [ ] Test with sample sekkei output directory
- [ ] Verify CJK rendering + table layout

## Success Criteria

- VitePress starts with custom theme and shows sekkei docs
- Sidebar reflects numbered directory structure in correct order
- Japanese text renders with proper font + line-height
- Tables have visible borders and readable column widths
- Feature sub-directories render as collapsible sidebar groups

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Sidebar builder misreads structure | Medium | Test with real sekkei output, handle edge cases |
| CSS conflicts with DefaultTheme | Low | Use CSS custom properties, avoid `!important` |
| Font not available on system | Low | Fallback font stack, Noto Sans JP from Google Fonts CDN |

## Security Considerations

- Sidebar builder only reads from validated docs directory
- No user-supplied HTML injected into theme

## Next Steps

- Phase 04: Milkdown editor component added to this theme
- Phase 05: Layout.vue enhanced with edit/save buttons
