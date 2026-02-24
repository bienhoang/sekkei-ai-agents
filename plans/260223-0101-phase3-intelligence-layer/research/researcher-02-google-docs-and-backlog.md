# Sekkei Phase 3: Google Docs/Sheets & Backlog API Research

**Date:** 2026-02-23
**Status:** Complete

---

## Topic 1: Google Docs/Sheets Export (D1)

### Google Docs API for Document Generation

**Capabilities:**
- Native markdown import/export (launched July 2024)
- Programmatic formatting: headings, tables, lists, text styling via batchUpdate API
- Two-step process: create document, then batchUpdate with content
- Tables supported but with manual cell management (less ergonomic than raw markdown)

**npm Packages:**
- `googleapis` (official): Full Google Workspace API support
- `google-auth-library`: OAuth2 & service account auth

**Auth Options:**
- Service account (recommended for server): JSON key file, no user consent UI
- OAuth2 user consent: For user-delegated access in enterprise scenarios
- Both support Japanese text natively via UTF-8

**Practical Finding:** Direct markdown→Google Docs requires custom logic—Google's markdown support is UI-only. Use `markdown-to-html` converter, then parse HTML to batchUpdate API calls. **Effort: Medium (3-4 days)**

---

### Google Sheets API for Tabular Data

**Better for Structured Output:**
- REQ-xxx, TBL-xxx, UT/IT/ST/UAT-xxx (test matrices) map naturally to spreadsheets
- Cell-based operations: `spreadsheets.values.batchUpdate` for bulk writes
- Built-in formatting (bold, borders, number formats)
- Faster than Google Docs for data-heavy documents

**Trade-off:** Not formatted like a report; more suitable for raw data export or cross-team review.

**Effort: Low (1-2 days)** — API simpler than Google Docs.

---

### Alternative: Google Drive Upload + Auto-Convert

**Limitation:** No API support for "Convert uploads to Google DOCS editor format" setting. File conversion happens only in UI or via Google Apps Script (which has scope limitations in 2024). **Not viable for automated server-side export.**

---

## Topic 2: Nulab Backlog Integration (D4)

### Backlog API v2 Capabilities

**Official npm Package:** `backlog-js` (https://github.com/nulab/backlog-js)
- Full TypeScript support for Node.js
- Covers issues, wikis, projects, users, webhooks

**Key Endpoints:**
- `addIssue()` → Create REQ-xxx as issue
- `getIssueList()` → Sync requirements into Sekkei
- `addComment()` → Link test results
- Webhooks → Bidirectional sync triggers

**Auth:** API key or OAuth2 token (enterprise-friendly).

---

### Sync Patterns for Sekkei

**REQ-xxx ↔ Backlog Issues:**
- Create issues with standardized naming: `[REQ-001] 商品検索機能`
- Store Sekkei ID in custom field or issue description metadata
- Webhook on issue update → regenerate document

**Test Cases as Tickets:**
- UT-xxx, IT-xxx, ST-xxx, UAT-xxx → Separate subtask hierarchy
- Status: Open → Passed → Closed workflow
- Comments store test execution logs

**Effort: Medium (4-5 days)** — Requires state machine for bidirectional sync.

---

### Market Validation: Backlog in Japanese SI Firms

**Finding:** Backlog is a **homegrown Nulab product** (Japanese SaaS), widely adopted in Japan. However, general search results show **no specific adoption metrics** for SI firms specifically.

**Context:** Japanese SIs (Fujitsu, NEC) dominate enterprise software—but this doesn't clarify Backlog's market share. Backlog is popular in Japanese startups/mid-market; SI adoption unclear.

**Recommendation:** Treat Backlog integration as **optional MVP feature** (D4). Validate with customer interviews before engineering effort. **ROI risk: medium.**

---

## Implementation Priority & Effort Summary

| Feature | API | Effort | Viability | Notes |
|---------|-----|--------|-----------|-------|
| Google Docs export | Docs API | Medium (3-4d) | High | Custom markdown→batchUpdate needed |
| Google Sheets export | Sheets API | Low (1-2d) | High | Best for tabular data (REQ, TBL, tests) |
| Drive auto-convert | Drive API | Low (1d) | **Low** | No API support for auto-convert setting |
| Backlog sync | backlog-js | Medium (4-5d) | Medium | Bidirectional sync complex; validate ROI first |

---

## Unresolved Questions

1. **Japanese Language Rendering:** Are there specific font/encoding issues in Google Docs API for keigo (敬語) or specialized technical terms?
2. **Table Complexity:** How does Google Docs API handle merged cells or nested tables (common in V-model docs)?
3. **Backlog Adoption:** What % of Sekkei target customers use Backlog vs other project management tools (Jira, Asana)?
4. **Rate Limits:** What are Google Docs/Sheets and Backlog API rate limits for bulk exports in enterprise scenarios?

---

## Sources

- [Google Docs API overview | Google for Developers](https://developers.google.com/docs/api/how-tos/overview)
- [Google Workspace Updates: Import and export Markdown in Google Docs](https://workspaceupdates.googleblog.com/2024/07/import-and-export-markdown-in-google-docs.html)
- [Google Sheets API Overview | Google for Developers](https://developers.google.com/workspace/sheets/api/guides/concepts)
- [GitHub - nulab/backlog-js: Backlog API version 2 client for browser and node](https://github.com/nulab/backlog-js)
- [Backlog API Overview | Backlog Developer API | Nulab](https://developer.nulab.com/docs/backlog/)
