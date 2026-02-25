> Sub-reference for non-admin shell skeletons. Loaded from `mockup-command.md`.

# Shell Type Skeletons

HTML templates and CSS class references for non-admin shell types.
See `mockup-command.md` for Shell Detection table, workflow, and annotation rules.

## Auth Shell Skeleton

For screens detected as `auth` shell type (F-AUTH-* prefix or `shell_type: auth`):

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Screen Name} — {Project Name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="auth-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="auth-shell" style="--viewport-width: 1024px;">
  <div class="auth-card">
    <div class="auth-logo"><i class="fa-solid fa-cube"></i></div>
    <h1 class="auth-title">{Screen Title}</h1>
    <p class="auth-subtitle">{Description text}</p>
    <!-- Form content with annotations starting from 1 -->
  </div>
  <div class="auth-footer">&copy; 2026 {Project Name}</div>
</div>
</div>
</body>
</html>
```

### Auth CSS Classes
| Class | Purpose |
|-------|---------|
| `.auth-shell` | Root flex container (centered, gradient bg) |
| `.auth-card` | White card (420px max, rounded, shadow) |
| `.auth-logo` | Centered logo icon square |
| `.auth-title` | Main heading (22px, centered) |
| `.auth-subtitle` | Subtext below title |
| `.auth-divider` | "or" divider line between methods |
| `.auth-link` | Centered text link (forgot password, sign up) |
| `.auth-footer` | Light footer text outside card |
| `.btn-social` | Full-width social login button with icon |
| `.checkbox-row` | Remember me / terms checkbox row |

### Auth Layout Example (Login)
```html
<div class="auth-card">
  <div class="auth-logo"><i class="fa-solid fa-shield-halved"></i></div>
  <h1 class="auth-title">ログイン</h1>
  <p class="auth-subtitle">アカウントにサインインしてください</p>
  <div class="component"><span class="annotation">1</span>
    <label class="input-label">メールアドレス<span class="required-mark">※</span></label>
    <div class="input-field"><span class="placeholder-text">mail@example.com</span></div>
  </div>
  <div class="component"><span class="annotation">2</span>
    <label class="input-label">パスワード<span class="required-mark">※</span></label>
    <div class="input-field"><span class="placeholder-text">パスワードを入力</span></div>
  </div>
  <div class="component"><span class="annotation">3</span>
    <div class="checkbox-row"><input type="checkbox"> ログイン状態を保持する</div>
  </div>
  <div class="component"><span class="annotation">4</span>
    <span class="btn btn-primary">ログイン</span>
  </div>
  <div class="auth-divider">または</div>
  <div class="component"><span class="annotation">5</span>
    <span class="btn-social"><i class="fa-brands fa-google"></i> Googleでログイン</span>
  </div>
  <a class="auth-link">パスワードをお忘れですか？</a>
</div>
```

## Error Shell Skeleton

For screens detected as `error` shell type (F-ERR-* prefix or `shell_type: error`):

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Error Code} — {Project Name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="error-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="error-shell" style="--viewport-width: 1024px;">
  <div class="error-content">
    <div class="error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
    <h1 class="error-code">{Code}</h1>
    <p class="error-message">{Short Message}</p>
    <p class="error-detail">{Detailed explanation}</p>
    <div class="error-actions">
      <!-- Action buttons with annotations -->
    </div>
  </div>
</div>
</div>
</body>
</html>
```

### Error CSS Classes
| Class | Purpose |
|-------|---------|
| `.error-shell` | Root flex container (centered, light bg) |
| `.error-content` | Centered content block (480px max) |
| `.error-icon` | Large icon (64px). Add `.danger` or `.warning` modifier |
| `.error-code` | Large error code number (72px, bold) |
| `.error-message` | Primary message text |
| `.error-detail` | Secondary explanation text |
| `.error-actions` | Button row (flex, centered) |

### Error Icon Mapping
| Error Type | Icon | Modifier |
|------------|------|----------|
| 404 Not Found | `fa-solid fa-magnifying-glass` | — |
| 403 Forbidden | `fa-solid fa-lock` | `.danger` |
| 500 Server Error | `fa-solid fa-triangle-exclamation` | `.danger` |
| 503 Maintenance | `fa-solid fa-wrench` | `.warning` |
| Access Denied | `fa-solid fa-shield-halved` | `.danger` |

## Onboarding Shell Skeleton

For screens detected as `onboarding` shell type (F-ONB-* prefix or `shell_type: onboarding`):

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Screen Name} — {Project Name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="onboarding-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="onboarding-shell" style="--viewport-width: 1024px;">
  <div class="onboarding-header">
    <div class="onboarding-logo"><i class="fa-solid fa-cube"></i></div>
    <span class="onboarding-brand">{Project Name}</span>
  </div>
  <div class="onboarding-body">
    <div class="stepper">
      <div class="step completed"><div class="step-circle">1</div><div class="step-label">ステップ1</div></div>
      <div class="step active"><div class="step-circle">2</div><div class="step-label">ステップ2</div></div>
      <div class="step"><div class="step-circle">3</div><div class="step-label">ステップ3</div></div>
    </div>
    <div class="onboarding-content">
      <h2 class="onboarding-title">{Step Title}</h2>
      <p class="onboarding-subtitle">{Step description}</p>
      <!-- Form content with annotations starting from 1 -->
    </div>
    <div class="onboarding-footer">
      <!-- Back/Next buttons with annotations -->
    </div>
  </div>
</div>
</div>
</body>
</html>
```

### Onboarding CSS Classes
| Class | Purpose |
|-------|---------|
| `.onboarding-shell` | Root flex column container |
| `.onboarding-header` | Top logo + brand strip |
| `.onboarding-logo` | Logo icon square |
| `.onboarding-brand` | App name text |
| `.onboarding-body` | Center-aligned body area |
| `.onboarding-content` | White card (560px max, form area) |
| `.onboarding-title` | Step heading |
| `.onboarding-subtitle` | Step description |
| `.onboarding-footer` | Back/Next button row |
| `.stepper` + `.step` | Progress indicator (reused from admin) |

## Public Shell Skeleton

For screens detected as `public` shell type (F-PUB-* or F-LP-* prefix or `shell_type: public`):

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Page Name} — {Project Name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="public-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="public-shell" style="--viewport-width: 1024px;">
  <nav class="public-nav">
    <div class="public-nav-brand"><i class="fa-solid fa-cube"></i> {Project Name}</div>
    <div class="public-nav-links">
      <a>機能</a><a>料金</a><a>お問い合わせ</a>
      <span class="btn btn-primary">ログイン</span>
    </div>
  </nav>
  <div class="public-hero">
    <h1 class="public-hero-title">{Headline}</h1>
    <p class="public-hero-subtitle">{Subtext}</p>
    <!-- CTA buttons with annotations -->
  </div>
  <div class="public-section">
    <h2 class="public-section-title">{Section Title}</h2>
    <div class="public-grid">
      <!-- Feature cards with annotations -->
    </div>
  </div>
  <footer class="public-footer">&copy; 2026 {Project Name}</footer>
</div>
</div>
</body>
</html>
```

### Public CSS Classes
| Class | Purpose |
|-------|---------|
| `.public-shell` | Root container (full-width, white bg) |
| `.public-nav` | Top navigation bar |
| `.public-nav-brand` | Logo + name |
| `.public-nav-links` | Nav link row |
| `.public-hero` | Large hero section (gradient bg) |
| `.public-hero-title` | Hero headline (36px) |
| `.public-hero-subtitle` | Hero subtext |
| `.public-section` | Content section with padding |
| `.public-section-title` | Section heading |
| `.public-grid` | Responsive card grid |
| `.public-card` | Feature card (`.public-card-icon`, `.public-card-title`, `.public-card-text`) |
| `.public-footer` | Dark footer |

## Email Shell Skeleton

For screens detected as `email` shell type (F-MAIL-* or F-EMAIL-* prefix or `shell_type: email`):

Note: This is a **visual preview only** — not production email HTML.

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Email Subject} — {Project Name}</title>
  <link rel="stylesheet" href="email-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="email-shell" style="--viewport-width: 1024px;">
  <div class="email-container">
    <div class="email-header">
      <div class="email-header-logo">{Project Name}</div>
    </div>
    <div class="email-body">
      <!-- Email content with annotations starting from 1 -->
    </div>
    <div class="email-footer">
      このメールは {Project Name} から自動送信されています。<br>
      配信停止はこちら
    </div>
  </div>
</div>
</div>
</body>
</html>
```

### Email CSS Classes
| Class | Purpose |
|-------|---------|
| `.email-shell` | Gray bg, centered container |
| `.email-container` | 600px white container with border |
| `.email-header` | Brand header (primary bg) |
| `.email-header-logo` | Logo text |
| `.email-body` | Content padding area |
| `.email-heading` | Section heading |
| `.email-text` | Body text paragraph |
| `.email-button` | CTA button |
| `.email-divider` | Horizontal rule |
| `.email-footer` | Gray footer with unsubscribe |

## Print Shell Skeleton

For screens detected as `print` shell type (F-PRINT-* prefix or `shell_type: print`):

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Document Title}</title>
  <link rel="stylesheet" href="print-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="print-shell">
  <div class="print-header">
    <div class="print-title">{Document Title}</div>
    <div class="print-meta">{Date}<br>Version {N}</div>
  </div>
  <div class="print-content">
    <!-- Sections with annotations -->
  </div>
  <div class="print-footer">Page 1 of 1</div>
</div>
</div>
</body>
</html>
```

### Print CSS Classes
| Class | Purpose |
|-------|---------|
| `.print-shell` | A4-width container (794px), no bg color |
| `.print-header` | Title + meta row, bottom border |
| `.print-title` | Document title |
| `.print-meta` | Date/version info |
| `.print-content` | Main content area |
| `.print-section` | Section with heading |
| `.print-section-title` | Section heading with underline |
| `.print-table` | Clean bordered table |
| `.print-footer` | Page number footer |

## Mobile Shell Skeleton

For screens detected as `mobile` shell type (F-APP-* prefix or `shell_type: mobile`):

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Screen Name} — {Project Name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="mobile-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="mobile-shell" style="--viewport-width: 390px;">
  <!-- Header (NO content annotations) -->
  <header class="shell-header">
    <div class="shell-header-back"><i class="fa-solid fa-chevron-left"></i></div>
    <div class="shell-header-title">{Screen Title}</div>
    <div class="shell-header-actions">
      <i class="fa-solid fa-ellipsis-vertical"></i>
    </div>
  </header>

  <!-- Content (annotations go HERE, starting from 1) -->
  <main class="shell-content">
    <!-- Screen-specific components with annotations -->
  </main>

  <!-- Tab bar (NO content annotations) -->
  <nav class="shell-tabbar">
    <div class="tab-item active"><i class="fa-solid fa-house"></i><span>ホーム</span></div>
    <div class="tab-item"><i class="fa-solid fa-magnifying-glass"></i><span>検索</span></div>
    <div class="tab-item"><i class="fa-solid fa-bell"></i><span>通知</span></div>
    <div class="tab-item"><i class="fa-solid fa-user"></i><span>プロフィール</span></div>
  </nav>
</div>
</div>
</body>
</html>
```

### Mobile CSS Classes — Shell Structure
| Class | Purpose |
|-------|---------|
| `.mobile-shell` | Root grid container (header + content + tabbar) |
| `.shell-header` | Top header bar (56px) |
| `.shell-header-back` | Back arrow button |
| `.shell-header-title` | Centered page title |
| `.shell-header-actions` | Right-side action icons |
| `.shell-content` | Scrollable main content area |
| `.shell-tabbar` | Bottom tab bar (56px, 4 tabs) |
| `.tab-item` | Tab button (icon + label, add `.active` for current) |

### Mobile CSS Classes — Components
| Class | Purpose |
|-------|---------|
| `.mobile-card` | Card with rounded corners + shadow |
| `.mobile-card-image` | Full-width image placeholder (200px) |
| `.list-item` | Flex row (avatar + content + chevron) |
| `.list-group` | Grouped section container |
| `.list-group-title` | Section label (uppercase, muted) |
| `.chat-bubble` | Message bubble (add `.sent` or `.received`) |
| `.chat-input-bar` | Message input + send button bar |
| `.feed-card` | Social post card |
| `.feed-actions` | Like/comment/share action row |
| `.profile-header` | Centered avatar + name + bio |
| `.profile-stats` | 3-column stats grid (posts/followers/following) |
| `.mobile-input` | Full-width input (48px, larger touch target) |
| `.mobile-toggle` | iOS-style toggle (add `.active` for on) |
| `.mobile-select` | Full-width select dropdown |
| `.bottom-sheet` | Slide-up overlay panel |
| `.chip-row` | Horizontal scrolling chip container |
| `.chip` | Pill-shaped tag (add `.active` for selected) |
| `.avatar-sm` / `.avatar-md` / `.avatar-lg` | 32px / 48px / 80px avatar circles |
| `.badge-dot` | 8px red notification dot |
| `.empty-state` | Centered icon + text for empty screens |
| `.notification-item` | Notification row (add `.unread` for highlight) |
| `.stat-card` | KPI card (smaller padding than admin) |
| `.dashboard-grid` | 2-column fixed grid |

### Mobile Layout Examples

#### Dashboard
```html
<main class="shell-content">
  <div class="dashboard-grid">
    <div class="component"><span class="annotation">1</span>
      <div class="stat-card"><div class="stat-value">1,234</div><div class="stat-label">ユーザー</div></div>
    </div>
    <div class="component"><span class="annotation">2</span>
      <div class="stat-card"><div class="stat-value">567</div><div class="stat-label">注文</div></div>
    </div>
    <div class="component full-span"><span class="annotation">3</span>
      <div class="chart-card">
        <div class="chart-title">月次推移</div>
        <div class="chart-container"><canvas id="chart-monthly"></canvas></div>
      </div>
    </div>
  </div>
</main>
```

#### List with Search + Filter Chips
```html
<main class="shell-content">
  <div class="component"><span class="annotation">1</span>
    <div class="input-field" style="border-radius:20px;"><span class="placeholder-text"><i class="fa-solid fa-magnifying-glass"></i> 検索...</span></div>
  </div>
  <div class="component"><span class="annotation">2</span>
    <div class="chip-row">
      <span class="chip active">すべて</span><span class="chip">進行中</span><span class="chip">完了</span>
    </div>
  </div>
  <div class="component"><span class="annotation">3</span>
    <div class="list-item"><span class="avatar-sm">T</span><div class="list-item-content"><div class="list-item-title">田中 太郎</div><div class="list-item-subtitle">エンジニア</div></div><i class="fa-solid fa-chevron-right list-item-chevron"></i></div>
    <div class="list-item"><span class="avatar-sm">S</span><div class="list-item-content"><div class="list-item-title">鈴木 花子</div><div class="list-item-subtitle">デザイナー</div></div><i class="fa-solid fa-chevron-right list-item-chevron"></i></div>
  </div>
</main>
```

#### Chat (tabbar hidden, chat-input-bar shown)
```html
<!-- Note: For chat screens, replace shell-tabbar with chat-input-bar -->
<div class="screen-wrap">
<div class="mobile-shell" style="--viewport-width: 390px;">
  <header class="shell-header">
    <div class="shell-header-back"><i class="fa-solid fa-chevron-left"></i></div>
    <div class="shell-header-title">チャット</div>
    <div class="shell-header-actions"><i class="fa-solid fa-phone"></i></div>
  </header>
  <main class="shell-content" style="padding-bottom:0;">
    <div class="chat-list">
      <div class="chat-bubble received">こんにちは！お元気ですか？</div>
      <div class="chat-bubble sent">元気です！ありがとうございます。</div>
    </div>
  </main>
  <div class="chat-input-bar">
    <div class="component" style="flex:1;margin-bottom:0;"><span class="annotation">1</span>
      <div class="input-field" style="border-radius:20px;min-height:36px;"><span class="placeholder-text">メッセージを入力...</span></div>
    </div>
    <div class="component" style="margin-bottom:0;"><span class="annotation">2</span>
      <div class="btn-send"><i class="fa-solid fa-paper-plane"></i></div>
    </div>
  </div>
</div>
</div>
```

## Blank Shell Skeleton

Use `shell_type: blank` explicit override only (no auto-detect prefix):

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Screen Name} — {Project Name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="blank-shell.css">
</head>
<body>
<div class="screen-wrap">
<div class="blank-shell" style="--viewport-width: 1024px;">
  <!-- All content with annotations starting from 1 — no chrome -->
</div>
</div>
</body>
</html>
```

### Blank CSS Classes
| Class | Purpose |
|-------|---------|
| `.blank-shell` | Minimal white container with padding |
| Standard `.component`, `.annotation`, `.btn`, `.input-field`, `.wf-table` | All shared components available |
