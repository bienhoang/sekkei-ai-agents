# Phase 2: Create Japanese Sitemap Template

## Context

- [Plan](./plan.md)
- Reference: `sekkei/packages/mcp-server/templates/ja/crud-matrix.md`
- Reference: `sekkei/packages/mcp-server/templates/ja/traceability-matrix.md`

## Overview

- **Priority**: High
- **Status**: pending
- **Description**: Create `templates/ja/sitemap.md` — Markdown template with YAML frontmatter for system functional structure map.

## Key Insights

- Auxiliary templates follow pattern: YAML frontmatter → AI Instructions comment → 改訂履歴 → 承認欄 → Main content placeholder
- Template must be flexible for different system types (web, mobile, API, internal, SaaS)
- Sitemap shows hierarchical page/screen/function structure with parent-child relationships
- Should support both tree notation and table format

## Requirements

### Functional
- YAML frontmatter with `doc_type: sitemap`
- AI Instructions comment block guiding hybrid input processing
- Standard boilerplate sections (改訂履歴, 承認欄)
- Main sitemap section with placeholder for hierarchical structure
- Support notation for: pages/screens, API endpoints, batch processes, admin functions

### Non-functional
- Follow exact same template format as `crud-matrix.md`
- Keep under 80 lines

## Related Code Files

- **Create**: `sekkei/packages/mcp-server/templates/ja/sitemap.md`

## Implementation Steps

1. Create `templates/ja/sitemap.md` with:
   - YAML frontmatter: `doc_type: sitemap`, sections: `[revision-history, approval, system-overview, sitemap-tree, page-list]`
   - AI Instructions comment explaining:
     - Generate hierarchical sitemap from user description + F-xxx IDs + code routes
     - Use tree notation (indented list) for page/function hierarchy
     - Include page-list table with columns: Page ID, Page Name, URL/Route, Parent, Related Functions (F-xxx), Description
   - 改訂履歴 table
   - 承認欄 table
   - システム概要 section (brief system type description)
   - サイトマップ (tree structure placeholder)
   - ページ一覧 (page list table placeholder)

## Todo List

- [ ] Create `templates/ja/sitemap.md` with YAML frontmatter
- [ ] Add AI Instructions comment block
- [ ] Add standard boilerplate (改訂履歴, 承認欄)
- [ ] Add sitemap-specific sections (tree + table)

## Success Criteria

- Template loads correctly via `template-loader.ts`
- YAML frontmatter parses with correct `doc_type: "sitemap"`
- Follows same structure pattern as other auxiliary templates

## Risk Assessment

- **Low risk**: New file, no existing code modified
- Template design must balance flexibility (different system types) vs specificity (useful AI instructions)

## Next Steps

- Phase 3: Add generation instructions
