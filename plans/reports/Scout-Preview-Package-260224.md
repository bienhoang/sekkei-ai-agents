# Sekkei Preview Package Scout Report

## Overview
**Package**: `@bienhoang/sekkei-preview` (v1.1.0)
**Description**: Express + React WYSIWYG editor + file browser for Japanese specification documents
**Type**: Full-stack web application (Node.js server + React client)

---

## 1. EDITOR TECHNOLOGY

### Current Editor: TipTap v3 (NOT Milkdown as README suggests)
- **Editor**: TipTap (React integration via @tiptap/react v3.20.0+)
- **Note**: README mentions Milkdown, but actual implementation uses TipTap v3
- **Key Extensions**:
  - StarterKit (base functionality: bold, italic, paragraph, heading, etc.)
  - Link (with autolink support, openOnClick: false)
  - Image (inline with base64 support)
  - Markdown (via tiptap-markdown v0.8.10 for bidirectional MD conversion)
  - Table Suite: Table, TableRow, TableCell, TableHeader (with resizable: false)
  - CodeBlockLowlight (syntax highlighting via lowlight v3.3.0)
  - Task lists (nested support)
  - Text formatting: Underline, Highlight, TextAlign, Subscript, Superscript, Typography
  - Placeholder, CharacterCount

### Syntax Highlighting
- **Library**: lowlight v3.3.0 (Prism.js compatibility)
- **Support**: Common language highlighting via `lowlight.common` (HTML, CSS, JS, Python, Java, etc.)
- **Custom View**: Custom `CodeBlockView` component for rendering code blocks + Mermaid diagrams

### Markdown Rendering
- **Strategy**: Two-way conversion via tiptap-markdown plugin
- **Export**: Editor → Markdown via `editor.storage.markdown.getMarkdown()`
- **Import**: Markdown → TipTap AST (automatic on load)
- **Image Path Handling**: Rewrites relative image paths to `/docs-assets/{dir}/{src}` for preview

---

## 2. WYSIWYG EDITOR FEATURES

### Supported Features
✓ Rich text formatting (bold, italic, underline, strikethrough, highlight)
✓ Text alignment (left, center, right)
✓ Subscript / Superscript
✓ Headings (H1, H2, H3)
✓ Lists (bullet, ordered, task-based)
✓ Tables (insert 3×3, add/delete rows/cols, merge cells, toggle header row)
✓ Code blocks (with syntax highlighting + language badges)
✓ Mermaid diagrams (live rendering in code blocks with `mermaid` language tag)
✓ Inline code
✓ Links (via URL prompt)
✓ Images (via URL or base64)
✓ Blockquotes
✓ Horizontal rules
✓ Character & word count display

### Toolbar
- Visual button-based interface (no WYSIWYG ribbon, minimal design)
- Groups: History | Format | Headings | Alignment | Lists | Insert | Table | Utilities
- Table dropdown menu for table-specific operations
- Status bar shows word/char count, unsaved indicator, save button
- Fullscreen toggle button

### Editor Modes
- **Normal Mode** (workspace): Full WYSIWYG editing with save
- **Guide Mode** (--guide CLI flag): Read-only preview (no save capability)
- Unsaved changes detection with confirmation on file switch

---

## 3. MERMAID DIAGRAM SUPPORT

### Implementation
- **Library**: mermaid v11.12.3
- **Configuration**: Dark theme, loose security, inherits font
- **Custom Component**: `MermaidDiagram` in `code-block-view.tsx`
- **Trigger**: Code block with language tag set to `mermaid`
- **Error Handling**: Displays Mermaid error messages in styled error box
- **Loading State**: "Rendering diagram…" spinner during async render

### Features
- Live rendering as user types
- Error display with detailed messages
- Dark mode styling (zinc-800/40 background, zinc-700/30 border)

---

## 4. TECH STACK

### Frontend (Client)
```json
{
  "Framework": "React 18.3.0 (TSX)",
  "Editor": "TipTap v3 (@tiptap/react)",
  "Styling": "Tailwind CSS v4.0.0 + @tailwindcss/vite",
  "Markdown": "tiptap-markdown v0.8.10",
  "Syntax Highlighting": "lowlight v3.3.0",
  "Diagrams": "mermaid v11.12.3",
  "Build": "Vite 6.0.0 + @vitejs/plugin-react",
  "Language": "TypeScript 5.7.0",
  "Type Safety": "@types/react 18.3.0, @types/react-dom 18.3.0"
}
```

### Backend (Server)
```json
{
  "Runtime": "Node.js 20+",
  "Framework": "Express 4.21.0",
  "Config": "YAML parsing via yaml v2.7.0",
  "Port Management": "get-port v7.1.0 (auto-port fallback)",
  "Browser Control": "open v11.0.0 (auto-open on startup)",
  "Build": "tsup v8.4.0 (tree-shaking)",
  "Dev": "tsx v4.19.0 (watch mode)",
  "Language": "TypeScript 5.7.0"
}
```

### Build & Package
- **Frontend Build**: Vite → `dist/client/` (SPA)
- **Server Build**: tsup (TSX → JS) → `dist/server/`
- **Bundle**: npm workspaces (monorepo via root package.json)
- **CLI Entry**: `bin.sekkei-preview` → `dist/server.js`
- **Publishing**: GitHub Packages (private registry)

---

## 5. JAPANESE DOCUMENT SUPPORT

### Language Features
- **UI Language**: Japanese
- **Font**: Noto Sans JP (googleapis) - weights 400, 500, 600
- **Document Encoding**: UTF-8
- **HTML Meta**: `lang="ja"`

### YAML Frontmatter Support
- **Format**: YAML between triple dashes at document start
- **Preservation**: Frontmatter preserved on save (extracted, edited, re-merged)
- **Parser**: Custom `splitFrontmatter()` / `joinFrontmatter()` utils
- **Regex**: `^---\r?\n([\s\S]*?)\r?\n---\r?\n?`

### Markdown Template Integration
- Documents expected in `workspace-docs/` (or `sekkei-docs/` legacy)
- Configuration via `sekkei.config.yaml` (output directory, etc.)
- Can override with `--docs <path>` CLI flag

---

## 6. KEY FILES & ARCHITECTURE

### Client Components
```
src/client/
├── App.tsx                          # Main layout (sidebar + editor + systembar)
├── main.tsx                         # React entry point
├── components/
│   ├── TiptapEditor.tsx             # WYSIWYG editor wrapper
│   ├── EditorToolbar.tsx            # Toolbar with formatting controls
│   ├── code-block-view.tsx          # Code block + Mermaid renderer
│   ├── TreeSidebar.tsx              # File tree navigation
│   ├── TreeNode.tsx                 # Recursive tree node
│   ├── SystemBar.tsx                # Version + mode display
│   └── EmptyState.tsx               # Placeholder UI
├── hooks/
│   ├── use-file.ts                  # Fetch file from API
│   ├── use-save-file.ts             # Save file to API (PUT)
│   ├── use-system.ts                # Fetch system info (version, mode)
│   └── use-tree.ts                  # Fetch document tree
└── (styling via prose + tailwind)
```

### Server Routes
```
src/server/
├── index.ts                         # CLI entry + server startup
├── app.ts                           # Express app factory
├── routes/
│   ├── files.ts                     # GET /api/files, PUT /api/files
│   └── tree.ts                      # GET /api/tree
└── utils/
    ├── frontmatter.ts               # YAML frontmatter split/join
    ├── resolve-docs-dir.ts          # Auto-resolve docs directory
    ├── safe-path.ts                 # Path traversal protection
    └── tree-scanner.ts              # Recursive .md file scanner
```

### Static Routes
- `/docs-assets/*` — Static image/media files from docsRoot
- `/*` — SPA fallback to index.html

---

## 7. SPECIAL REQUIREMENTS

### Document Discovery
1. CLI flag: `--docs <path>` (highest priority)
2. Convention: `./workspace-docs/` (CWD)
3. Legacy: `./sekkei-docs/` (CWD)
4. Config: `sekkei.config.yaml` → `output.directory`
5. Error if none found

### Docs Directory Structure
- **Scan**: Recursive `.md` file search
- **Skip**: `.git/`, `node_modules/`, `.vitepress/`, `.yaml/.yml`, hidden files
- **Sort**: Numeric-aware, directories first, `index.md` first within files
- **Output**: Nested `TreeNode[]` structure

### File Save Workflow
1. User edits markdown in TipTap editor
2. Markdown extracted via `editor.storage.markdown.getMarkdown()`
3. PUT `/api/files?path=<relPath>` with `{content: "..."}` 
4. Server reads existing file, extracts YAML frontmatter
5. Merges: frontmatter + new markdown body
6. Writes back to disk (preserving metadata)
7. Response: `{path, saved: true}`

### Readonly Mode (--guide)
- Flag: `--guide` CLI option
- Mode: 'guide' (vs 'workspace')
- Effect: 
  - File browser still works (read-only tree)
  - PUT `/api/files` returns 403 (forbidden)
  - Editor shows readonly=true
  - Toolbar hidden
  - No save button

---

## 8. BUILD & DEPLOYMENT

### Build Process
```bash
npm run build                   # Runs:
# 1. rm -rf dist && vite build
# 2. tsup (server compilation)
# 3. npm run build:guide (copy docs/user-guide → guide/)

npm run dev:server             # tsx watch src/server/index.ts
npm run dev:client             # vite (hot reload on port 5173)
npm run lint                   # tsc --noEmit (both configs)
npm run test                   # No-op (exit 0)
```

### CLI Interface
```bash
sekkei-preview [options]
  --docs <path>               # Override docs directory
  --guide                     # Serve bundled user guide (readonly)
  --port <N>                  # Server port (default: 4983, auto if busy)
  --no-open                   # Skip opening browser
  --help                       # Show help
```

### Server Startup
- Auto-resolves docs directory
- Gets available port (default 4983, falls back to auto)
- Reads version from package.json
- Starts Express server on `127.0.0.1`
- Opens browser automatically (unless --no-open)
- Logs to stderr: version, mode, docs path, URL

---

## 9. EXPORT & INTEGRATION

### Export Capabilities
- **Native Export**: Markdown → TipTap Editor (internal)
- **No Built-in Export**: No PDF/Excel/DOCX export in preview package itself
- **Downstream Integration**: MCP Server handles actual document exports
- **Save Target**: Writes back to `.md` files in docsRoot only

### Integration Points
- **Upstream**: sekkei-mcp-server generates `.md` documents
- **Downstream**: Documents saved locally, can be re-imported to MCP server
- **Skills Integration**: `/sekkei:preview` command in Claude Code

---

## 10. UNRESOLVED QUESTIONS & NOTES

### Discrepancies
- **README vs Code**: README claims "Milkdown WYSIWYG" but implementation is TipTap v3
  - TipTap v3 is more modern, has better React integration, active development
  - Recommend updating README to reflect actual implementation

### Potential Enhancements
- Table resizing disabled (`resizable: false`) — consider enabling for better UX
- Image insertion via URL only — could add file upload UI
- No built-in PDF preview — images work, but complex layouts may not render perfectly
- No search/find functionality across documents
- No version control (git integration)

### Performance Notes
- Mermaid rendering is async but can block on large diagrams
- No lazy loading for large document trees
- Character count updates on every keystroke (minor perf concern for very large docs)

### Security
- Path traversal protection via `safePath()` utility (validated)
- YAML frontmatter preserved (prevents injection if YAML is trusted)
- Markdown content is trusted (no HTML sanitization — user owns the server)

---

## 11. RECENT CHANGES (from git log)

| Commit | Feature |
|--------|---------|
| 902411b | v1.1.0 bump + README update |
| 74d1dd7 | Enhanced editor: tables, mermaid, code highlight, modern UI |
| 33798fc | **Major**: Rewrite from VitePress+Vue+Milkdown → Express+React+TipTap v3 |
| f6e3f92 | Added --guide flag + user-guide structure |

**Last Major Change**: Complete rewrite to TipTap v3 (more maintainable, better React support)

---

## SUMMARY TABLE

| Aspect | Value |
|--------|-------|
| **Editor** | TipTap v3 (React) |
| **Framework** | Express 4 (server) + React 18 (client) |
| **Styling** | Tailwind CSS v4 |
| **Syntax Highlighting** | lowlight v3.3.0 |
| **Diagrams** | Mermaid v11.12.3 |
| **Language Support** | TypeScript 5.7, ESM, Node 20+ |
| **YAML Support** | Yes (frontmatter preserved) |
| **Japanese Support** | Yes (Noto Sans JP, UTF-8) |
| **Export** | Save to `.md` only (no PDF/Excel) |
| **Readonly Mode** | Yes (--guide flag) |
| **CLI Package** | Yes (npm global or npx) |
| **Monorepo Integration** | Yes (npm workspaces) |

