> This reference is loaded when `/sekkei:mockup` is invoked.

# Screen Mockup Generation

Generate HTML screen mockups from screen definitions using the admin-shell template.
Output: interactive HTML files with numbered annotations mapping to 画面項目定義 tables.

## Prerequisites

1. `sekkei.config.yaml` exists with `output.directory` configured
2. Screen definitions exist in one of:
   - **Split mode**: `features/{id}/screen-design.md` (per-feature)
   - **Monolithic**: `03-system/basic-design.md` § 画面一覧

## Invocation Modes

| Mode | Command | What it does |
|------|---------|--------------|
| Full | `/sekkei:mockup` | Generate HTML from screen defs → screenshot → embed PNGs |
| Screenshot only | `/sekkei:mockup --screenshot` | Re-screenshot existing HTML in `11-mockups/` → update PNGs |
| From screen-design | After generating screen-design.md | Screens for that feature only |

**Typical flow:**
```
/sekkei:mockup                → gen HTML + screenshot + embed
(user edits HTML manually)
/sekkei:mockup --screenshot   → re-screenshot + re-embed (no HTML regen)
```

## Workflow

### Full mode (default)

1. Read `sekkei.config.yaml` → get `output.directory`
2. Scan workspace for screen definitions (split or monolithic)
3. Read `functions-list.md` → extract nav items for sidebar
4. For each screen:
   a. Copy HTML template skeleton below
   b. Fill sidebar nav from project's function list
   c. Fill `.shell-content` with screen-specific components
   d. Add content-area annotations (sequential from 1)
   e. Save to `{output.directory}/11-mockups/{function-id}-{screen-name-kebab}.html`
5. Copy `admin-shell.css` to `{output.directory}/11-mockups/admin-shell.css`
   - Source: this file is bundled at `packages/mcp-server/templates/wireframe/admin-shell.css`
   - If running via MCP, read the CSS content and write it to the output directory
6. Continue to screenshot steps below

### Screenshot-only mode (`--screenshot`)

1. Read `sekkei.config.yaml` → get `output.directory`
2. Scan `{output.directory}/11-mockups/*.html` for existing HTML files
3. Skip HTML generation — go directly to screenshot steps below
6. **Screenshot each HTML → PNG** (with annotations visible):
   - Use Playwright or `chrome-devtools` skill to open each HTML file in browser
   - Screenshot the full `.screen-wrap` element (captures shell + annotations)
   - **Split mode**: save to `features/{feature-id}/assets/images/{function-id}-{screen-name-kebab}.png`
   - **Monolithic**: save to `03-system/assets/images/{function-id}-{screen-name-kebab}.png`
   - For multi-screen HTML: screenshot each `.screen-wrap` separately, naming `{id}-{screen}-{seq}.png`
   - Create `assets/images/` directory if it doesn't exist
7. **Embed PNG into screen-design.md**:
   - For each screen in `screen-design.md`, insert image reference after section 1 (画面レイアウト):
     ```markdown
     ![SCR-{ID} モックアップ](./assets/images/{function-id}-{screen-name-kebab}.png)
     ```
   - **Split mode**: insert into `features/{id}/screen-design.md` (relative: `./assets/images/`)
   - **Monolithic**: insert into `03-system/basic-design.md` (relative: `./assets/images/`)
   - Keep YAML layout block as-is (human-readable structure reference)
   - The annotation numbers in the PNG must match the # column in 画面項目定義 table (section 2)

### Screenshot Script (Playwright)

```javascript
// Playwright screenshot (already installed for PDF export)
// viewport: 1440px for full HD clarity; deviceScaleFactor: 2 for crisp retina output
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`file://${absolutePathToHtml}`, { waitUntil: 'networkidle' });
const wraps = await page.locator('.screen-wrap').all();
for (let i = 0; i < wraps.length; i++) {
  await wraps[i].screenshot({ path: `output-${i}.png` });
}
await browser.close();
```

Alternatively, use `chrome-devtools` or `agent-browser` skill for browser automation.

## HTML Template Skeleton

Every generated HTML file MUST use this exact structure:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Screen Name} — {Project Name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="admin-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="admin-shell" style="--viewport-width: 1024px;">
  <!-- Header (NO content annotations) -->
  <header class="shell-header">
    <div class="shell-header-left">
      <div class="shell-search"><i class="fa-solid fa-magnifying-glass"></i><span>検索...</span></div>
    </div>
    <div class="shell-header-right">
      <div class="shell-icon-btn"><i class="fa-regular fa-bell"></i><span class="notify-dot"></span></div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="shell-avatar">T</span>
        <div class="shell-user-info">
          <span class="shell-user-name">田中 太郎</span>
          <span class="shell-user-role">管理者</span>
        </div>
      </div>
    </div>
  </header>

  <!-- Sidebar (NO content annotations) — populate nav from functions-list -->
  <aside class="shell-sidebar">
    <div class="shell-sidebar-brand">
      <div class="shell-sidebar-logo"><i class="fa-solid fa-cube"></i></div>
      <span class="shell-sidebar-name">{Project Name}</span>
    </div>
    <nav class="shell-sidebar-nav">
      <div class="shell-nav-section">メインメニュー</div>
      <!-- One .shell-nav-item per function from functions-list -->
      <div class="shell-nav-item active"><i class="fa-solid fa-house"></i> {Current Screen}</div>
      <div class="shell-nav-item"><i class="fa-solid fa-users"></i> {Other Function}</div>
      <!-- ... -->
    </nav>
    <div class="shell-sidebar-footer">&copy; 2026 {Project Name}</div>
  </aside>

  <!-- Content (annotations go HERE, starting from 1) -->
  <main class="shell-content">
    <div class="shell-breadcrumb"><span>ホーム</span><span>{Section}</span><span>{Screen Name}</span></div>
    <div class="shell-page-title">{Screen Title}</div>
    <!-- Screen-specific components with annotations -->
  </main>
</div>
</div>
</body>
</html>
```

## CSS Class Reference

### Shell Structure
| Class | Purpose |
|-------|---------|
| `.admin-shell` | Root grid container (sidebar + header + content) |
| `.shell-header` | Top header bar |
| `.shell-header-left`, `.shell-header-right` | Header flex containers |
| `.shell-search` | Search input in header |
| `.shell-icon-btn` | Icon button (bell, mail) |
| `.shell-avatar` | User avatar circle |
| `.shell-user-info`, `.shell-user-name`, `.shell-user-role` | User display |
| `.shell-sidebar` | Left sidebar |
| `.shell-sidebar-brand` | Logo + app name |
| `.shell-sidebar-logo`, `.shell-sidebar-name` | Brand elements |
| `.shell-sidebar-nav` | Nav container |
| `.shell-nav-section` | Section label (uppercase) |
| `.shell-nav-item` | Nav link (add `.active` for current) |
| `.shell-sidebar-footer` | Bottom copyright |
| `.shell-content` | Main content area |
| `.shell-breadcrumb` | Breadcrumb navigation |
| `.shell-page-title` | Page heading |

### Content Components
| Class | Purpose |
|-------|---------|
| `.component` | Wrapper for annotated element |
| `.annotation` | Red badge (content area, 26px) |
| `.shell-annotation` | Red badge (shell area, 22px — header/sidebar only) |
| `.input-field` | Text input |
| `.textarea-field` | Textarea |
| `.select-field` | Dropdown select |
| `.input-label` | Label above input |
| `.required-mark` | Red ※ for required fields |
| `.placeholder-text` | Gray placeholder text |
| `.btn` | Base button |
| `.btn-primary` | Blue primary button |
| `.btn-secondary` | White outlined button |
| `.btn-danger` | Red danger button |

### Data Display
| Class | Purpose |
|-------|---------|
| `.stat-card` | KPI card with `.stat-value` + `.stat-label` |
| `.chart-placeholder` | Chart placeholder box |
| `.wf-table` | Data table |
| `.wf-table-title` | Table heading |
| `.badge` | Status badge pill |
| `.alert-box` | Warning/info alert |

### Layout Patterns
| Class | Purpose |
|-------|---------|
| `.dashboard-grid` | Auto-fit grid for cards |
| `.full-span` | Span full grid width |
| `.list-toolbar` | Flex toolbar (search + filters + button) |
| `.list-table-wrap` | Card wrapper for table |
| `.pagination` | Page number row |
| `.form-container` | Form card (max-width: 640px, flex-wrap) |
| `.form-title` | Form heading |
| `.form-footer` | Button row at form bottom |

### Width Utilities
| Class | Width | Use in `.form-container` |
|-------|-------|--------------------------|
| `.w-sm` | 25% | Quarter-width field |
| `.w-md` | 50% | Half-width field |
| `.w-lg` | 75% | Three-quarter-width field |
| `.w-full` | 100% | Full-width field |

### Wizard
| Class | Purpose |
|-------|---------|
| `.stepper` | Step indicator bar |
| `.step` | Individual step (add `.active` or `.completed`) |
| `.step-circle` | Numbered circle |
| `.step-label` | Step name text |
| `.step-content` | Active step content area |
| `.step-nav` | Previous/Next button row |

### Multi-Screen
| Class | Purpose |
|-------|---------|
| `.screen-wrap` | Padding wrapper per screen |
| `.screen-separator` | Dashed divider between screens |

## Annotation Rules

1. **Content-area only**: Annotations go ONLY inside `.shell-content`
2. **No shell annotations**: Do NOT annotate header or sidebar elements
3. **Sequential from 1**: Number starting from 1 per screen, incrementing for each interactive element
4. **Mapping**: Each annotation number maps to a row in 画面項目定義 table (section 2 of screen-design.md)
5. **Syntax**: Wrap in `.component` with `.annotation` badge:
   ```html
   <div class="component">
     <span class="annotation">1</span>
     <!-- actual UI element here -->
   </div>
   ```
6. **What to annotate**: Input fields, buttons, select dropdowns, tables, stat cards, charts, pagination — any interactive or data-display element
7. **What NOT to annotate**: Breadcrumbs, page titles, labels (unless standalone), static text

## File Naming

- Pattern: `{function-id}-{screen-name-kebab}.html`
- Examples: `F-AUTH-login-form.html`, `F-USR-user-list.html`, `F-ORD-order-detail.html`
- Output directory: `{output.directory}/11-mockups/`

## Layout Pattern Examples

### Dashboard
```html
<main class="shell-content">
  <div class="shell-breadcrumb"><span>ホーム</span><span>ダッシュボード</span></div>
  <div class="shell-page-title">ダッシュボード</div>
  <div class="dashboard-grid">
    <div class="component"><span class="annotation">1</span>
      <div class="stat-card"><div class="stat-value">1,234</div><div class="stat-label">総ユーザー数</div></div>
    </div>
    <!-- more stat-cards... -->
    <div class="component full-span"><span class="annotation">4</span>
      <div class="chart-placeholder"><i class="fa-solid fa-chart-line"></i> [Chart: 月次推移]</div>
    </div>
  </div>
</main>
```

### List
```html
<main class="shell-content">
  <div class="shell-breadcrumb"><span>ホーム</span><span>ユーザー管理</span><span>一覧</span></div>
  <div class="shell-page-title">ユーザー一覧</div>
  <div class="list-toolbar">
    <div class="component" style="flex:1;margin-bottom:0;"><span class="annotation">1</span>
      <div class="input-field" style="max-width:280px;"><span class="placeholder-text">検索...</span></div>
    </div>
    <div class="component" style="margin-bottom:0;"><span class="annotation">2</span>
      <span class="btn btn-primary"><i class="fa-solid fa-plus"></i> 新規登録</span>
    </div>
  </div>
  <div class="list-table-wrap">
    <div class="component" style="margin-bottom:0;"><span class="annotation">3</span>
      <table class="wf-table"><!-- ... --></table>
    </div>
  </div>
</main>
```

### Form
```html
<main class="shell-content">
  <div class="shell-breadcrumb"><span>ホーム</span><span>ユーザー管理</span><span>新規登録</span></div>
  <div class="shell-page-title">ユーザー新規登録</div>
  <div class="form-container">
    <div class="component w-md"><span class="annotation">1</span>
      <label class="input-label">姓<span class="required-mark">※</span></label>
      <div class="input-field"><span class="placeholder-text">姓を入力</span></div>
    </div>
    <div class="component w-md"><span class="annotation">2</span>
      <label class="input-label">名<span class="required-mark">※</span></label>
      <div class="input-field"><span class="placeholder-text">名を入力</span></div>
    </div>
  </div>
  <div class="form-footer" style="max-width:640px;">
    <div class="component" style="margin-bottom:0;"><span class="annotation">3</span>
      <span class="btn btn-secondary">キャンセル</span>
    </div>
    <div class="component" style="margin-bottom:0;"><span class="annotation">4</span>
      <span class="btn btn-primary">登録</span>
    </div>
  </div>
</main>
```

## Sidebar Icon Selection

Choose Font Awesome icons that match the function's purpose:

| Function Type | Icon |
|---------------|------|
| Dashboard/Home | `fa-solid fa-house` |
| User management | `fa-solid fa-users` |
| Product/Item | `fa-solid fa-box` |
| Order/Cart | `fa-solid fa-shopping-cart` |
| Report/Analytics | `fa-solid fa-chart-bar` |
| Settings | `fa-solid fa-gear` |
| Logout | `fa-solid fa-right-from-bracket` |
| Calendar/Schedule | `fa-solid fa-calendar` |
| Document/File | `fa-solid fa-file-lines` |
| Notification | `fa-solid fa-bell` |
| Payment/Finance | `fa-solid fa-credit-card` |
| Message/Mail | `fa-solid fa-envelope` |
