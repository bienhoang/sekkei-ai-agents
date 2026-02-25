> This reference is loaded when `/sekkei:mockup` is invoked.

# Screen Mockup Generation

Generate HTML screen mockups from screen definitions using shell-type templates.
Output: interactive HTML files with numbered annotations mapping to 画面項目定義 tables.

## Prerequisites

1. `sekkei.config.yaml` exists with `output.directory` configured
2. Screen definitions exist in one of:
   - **Split mode**: `features/{id}/screen-design.md` (per-feature)
   - **Monolithic**: `03-system/basic-design.md` § 画面一覧

## Shell Detection

Determine the shell type for each screen based on function ID prefix:

| Prefix Pattern | Shell Type | CSS File | Layout |
|----------------|-----------|----------|--------|
| `F-AUTH-*` | auth | `auth-shell.css` | Centered card on gradient bg |
| `F-ONB-*` | onboarding | `onboarding-shell.css` | Logo + stepper + centered content |
| `F-PUB-*`, `F-LP-*` | public | `public-shell.css` | Top nav + hero + sections + footer |
| `F-ERR-*` | error | `error-shell.css` | Centered icon + message |
| `F-MAIL-*`, `F-EMAIL-*` | email | `email-shell.css` | 600px email container |
| `F-PRINT-*` | print | `print-shell.css` | A4 clean layout |
| `F-APP-*` | mobile | `mobile-shell.css` | Top header + Content + Bottom tab bar |
| Everything else | admin | `admin-shell.css` | Sidebar + Header + Content |

Note: `blank` shell has no auto-detect prefix — use `shell_type: blank` explicit override only.

**Override**: If `shell_type` is specified in screen-design.md YAML block, use that instead:
```yaml
layout_type: form
shell_type: auth    # force auth shell regardless of function ID
viewport: desktop
```

**Workflow step 4a update**: Before copying HTML skeleton, check function ID prefix → select correct shell type → use corresponding HTML skeleton and CSS file.

**Workflow step 5 update**: Copy the CSS file(s) used by screens in this batch:
- Source: `~/.claude/skills/sekkei/{shell-type}-shell.css`
- Destination: `{output.directory}/11-mockups/{shell-type}-shell.css`

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
5. Copy shell CSS file(s) to `{output.directory}/11-mockups/`
   - Source: `~/.claude/skills/sekkei/{shell-type}-shell.css` (installed by `install.sh`)
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

Playwright is installed in the Sekkei MCP server package. To resolve it from any project directory,
set `NODE_PATH` to the sekkei installation's `node_modules/`:

Write and run an ESM screenshot script (`.mjs` extension):

```javascript
// Resolve playwright from sekkei's own node_modules (ESM ignores NODE_PATH)
import { createRequire } from 'module';
import { execSync } from 'child_process';
const sekkeiRoot = execSync('dirname "$(dirname "$(realpath "$(which sekkei)")")"').toString().trim();
const require = createRequire(sekkeiRoot + '/node_modules/');
const { chromium } = require('playwright');

// viewport: 1440px for full HD clarity; deviceScaleFactor: 2 for crisp retina output
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`file://${absolutePathToHtml}`, { waitUntil: 'networkidle' });
// Wait for Chart.js canvases to finish rendering
// Note: __chart is an undocumented Chart.js v4 internal; CDN pins @4, catch() handles breakage
await page.waitForFunction(() => {
  const canvases = document.querySelectorAll('.chart-container canvas');
  return canvases.length === 0 || [...canvases].every(c => c.getContext('2d').__chart);
}, { timeout: 5000 }).catch(() => {});
const wraps = await page.locator('.screen-wrap').all();
for (let i = 0; i < wraps.length; i++) {
  await wraps[i].screenshot({ path: `output-${i}.png` });
}
await browser.close();
```

Run with: `node screenshot.mjs`

**Mobile shell screenshots**: Use `viewport: { width: 390, height: 844 }` for mobile shell screens. The `fullPage: true` option captures full content height.

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

## Non-Admin Shell Skeletons

For non-admin shell types (auth, error, onboarding, public, email, print, blank, mobile), read `references/mockup-shells.md` for HTML skeletons, CSS class references, and layout examples.

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
| `.chart-placeholder` | Legacy chart placeholder box (fallback) |
| `.chart-card` | Chart wrapper card (white bg, border, shadow) |
| `.chart-title` | Chart heading text |
| `.chart-container` | Fixed-height canvas wrapper (280px) |
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

## Chart.js Integration

When a screen contains charts (dashboard, analytics, reports), use real Chart.js instead of `.chart-placeholder`.

### CDN Include
Add before `</head>`:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
```

### Chart HTML Pattern
```html
<div class="component full-span"><span class="annotation">{N}</span>
  <div class="chart-card">
    <div class="chart-title">{Chart Title}</div>
    <div class="chart-container">
      <canvas id="chart-{unique-id}"></canvas>
    </div>
  </div>
</div>
```

### Chart Script (before </body>)
```html
<script>
const chartColors = {
  primary: '#2563EB', primaryLight: '#93C5FD',
  secondary: '#10B981', secondaryLight: '#6EE7B7',
  accent: '#F59E0B', accentLight: '#FCD34D',
  danger: '#EF4444', dangerLight: '#FCA5A5',
  gray: '#64748B', grayLight: '#CBD5E1'
};

new Chart(document.getElementById('chart-{unique-id}'), {
  type: 'bar',  // bar | line | pie | doughnut
  data: {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    datasets: [{
      label: '{Dataset Label}',
      data: [120, 190, 150, 210, 180, 240],
      backgroundColor: chartColors.primary
    }]
  },
  options: {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: { y: { beginAtZero: true } }
  }
});
</script>
```

### Chart Safety Rules
1. **ALWAYS** set `animation: false` — required for screenshot
2. **ALWAYS** use `.chart-container` with fixed height (280px) — prevents layout blow-up
3. **ALWAYS** set `responsive: true` + `maintainAspectRatio: false`
4. **Max 4 charts per screen** — more charts risk layout overflow
5. Each canvas needs unique `id` attribute

### Chart Recipe Table
| Context | Type | Labels | Sample Data Range |
|---------|------|--------|-------------------|
| Sales/Revenue | bar or line | 月 names (1月〜12月) | 100-1000 |
| User counts | line with fill | 月 or 週 names | 10-500 |
| Status distribution | pie or doughnut | Status names (完了, 進行中, 未着手) | percentages summing to 100 |
| Comparison | grouped bar | Category names | varies |
| Time series | line | Date strings | varies |

### Pie/Doughnut Variant
For pie/doughnut charts, omit `scales` and use array `backgroundColor`:
```javascript
{
  type: 'doughnut',
  data: {
    labels: ['完了', '進行中', '未着手'],
    datasets: [{
      data: [45, 35, 20],
      backgroundColor: [chartColors.primary, chartColors.secondary, chartColors.gray]
    }]
  },
  options: { animation: false, responsive: true, maintainAspectRatio: false }
}
```

## Annotation Rules

1. **Content-area only**: Annotations go ONLY inside the content area:
   - `admin`: `.shell-content`
   - `mobile`: `.shell-content`
   - `auth`: `.auth-card`
   - `onboarding`: `.onboarding-content`
   - `public`: `.public-hero` + `.public-section`
   - `error`: `.error-actions`
   - `email`: `.email-body`
   - `print`: `.print-content`
   - `blank`: `.blank-shell` (entire shell is content)
2. **No shell annotations**: Do NOT annotate header, sidebar, footer chrome elements
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
    <!-- more stat-cards (annotations 2, 3) -->
    <div class="component full-span"><span class="annotation">4</span>
      <div class="chart-card">
        <div class="chart-title">月次推移</div>
        <div class="chart-container"><canvas id="chart-monthly"></canvas></div>
      </div>
    </div>
  </div>
</main>
<!-- Chart.js script before </body> — see Chart.js Integration section -->
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
