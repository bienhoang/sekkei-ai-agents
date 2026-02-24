# Phase 3: Playwright Renderer

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-mockup-schema-and-parser.md), [Phase 2](./phase-02-wireframe-templates.md)
- Playwright docs: https://playwright.dev/docs/api/class-page#page-screenshot

## Overview
- **Priority:** High (core rendering engine)
- **Status:** pending
- **Effort:** 1.5h
- **Description:** Use Playwright to screenshot HTML wireframes to PNG files

## Key Insights
- Playwright auto-installs Chromium on first use (`npx playwright install chromium`)
- `page.setContent(html)` loads HTML string directly — no file server needed
- `page.screenshot({ fullPage: true })` captures entire content
- Need to wait for Google Fonts to load before screenshot (`page.waitForLoadState('networkidle')`)
- Browser instance should be launched once and reused for multiple screens in same generation
- Viewport size set per layout's `viewport` property

## Requirements

### Functional
- `renderMockupPng(html: string, viewport: Viewport, outputPath: string): Promise<void>` — screenshot HTML to PNG
- `renderScreenDesign(markdown: string, outputDir: string): Promise<string[]>` — parse all screens → render each → return PNG paths
- Browser lifecycle: launch once per batch, close after all renders

### Non-Functional
- Graceful fallback when Playwright not installed (warn, skip rendering, keep YAML in markdown)
- Logs to stderr via pino (stdout sacred for MCP JSON-RPC)
- PNG quality: 2x device scale factor for retina-sharp text
- Timeout: 30s per screenshot (Google Fonts may be slow first time)

## Architecture

```
renderScreenDesign(markdown, outputDir)
    ↓
parseScreenLayouts(markdown)  ← Phase 1
    ↓ returns ScreenLayout[]
for each layout:
    buildMockupHtml(layout)   ← Phase 2
        ↓ returns HTML string
    renderMockupPng(html, viewport, path)
        ↓ Playwright: setContent → waitForFonts → screenshot
        ↓ saves PNG to outputDir/images/SCR-xxx.png
    ↓
returns paths: ["images/SCR-xxx.png", ...]
```

## Related Code Files

### New Files
| File | Purpose | LOC Est |
|------|---------|---------|
| `mcp-server/src/lib/mockup-renderer.ts` | Playwright screenshot engine | ~100 |

### Modified Files
| File | Change |
|------|--------|
| `mcp-server/package.json` | Add `playwright` as optional dependency |

### Reference Files
| File | Why |
|------|-----|
| `mcp-server/src/lib/mockup-parser.ts` (Phase 1) | `parseScreenLayouts()` |
| `mcp-server/src/lib/mockup-html-builder.ts` (Phase 2) | `buildMockupHtml()` |
| `mcp-server/src/lib/python-bridge.ts` | Pattern for external process handling |
| `mcp-server/src/lib/errors.ts` | SekkeiError for failures |

## Implementation Steps

1. **Add playwright to mcp-server**:
   ```bash
   cd mcp-server && npm install playwright
   npx playwright install chromium
   ```
   - Add as optional dep (rendering is enhancement, not core MCP function)

2. **Create `mcp-server/src/lib/mockup-renderer.ts`**:

   a. **Viewport config map**:
   ```typescript
   const VIEWPORTS: Record<string, { width: number; height: number }> = {
     desktop: { width: 1024, height: 768 },
     tablet:  { width: 768, height: 1024 },
     mobile:  { width: 375, height: 812 },
   };
   ```

   b. **`renderMockupPng()`**:
   - Accept `html: string`, `viewport: string`, `outputPath: string`
   - Lazy-import playwright: `const { chromium } = await import('playwright')`
   - Launch browser (headless, no sandbox args for CI)
   - Create page, set viewport with `deviceScaleFactor: 2`
   - `page.setContent(html, { waitUntil: 'networkidle' })` — waits for Google Fonts
   - `page.screenshot({ path: outputPath, fullPage: true, type: 'png' })`
   - Close page (not browser — reuse for batch)
   - Wrap in try/catch → SekkeiError("MOCKUP_ERROR", ...)

   c. **`renderScreenDesign()`** — high-level orchestrator:
   - Parse markdown → `ScreenLayout[]` via `parseScreenLayouts()`
   - Create `images/` subdir in outputDir
   - Launch browser once
   - For each layout:
     - Build HTML via `buildMockupHtml(layout)`
     - Determine filename: `SCR-{screen_id}.png` or fallback `screen-{index}.png`
     - Call `renderMockupPng()` with shared browser context
   - Close browser
   - Return array of relative image paths

   d. **`isPlaywrightAvailable()`** — check if playwright installed:
   - Try dynamic import, return boolean
   - If unavailable, log warning to stderr, return gracefully

3. **Update `mcp-server/package.json`**:
   - Add `"playwright": "^1.49.0"` to `dependencies`
   - Add postinstall hint: `"postinstall:note": "Run 'npx playwright install chromium' for mockup rendering"`

4. **Compile check**: `npm run lint`

## Todo List
- [ ] Install playwright + chromium in mcp-server
- [ ] Create `mockup-renderer.ts` with `renderMockupPng()` and `renderScreenDesign()`
- [ ] Implement `isPlaywrightAvailable()` graceful check
- [ ] Handle browser lifecycle (launch once, reuse, close)
- [ ] Set `deviceScaleFactor: 2` for crisp text
- [ ] Wait for Google Fonts load before screenshot
- [ ] Ensure all logs go to stderr (pino logger)
- [ ] Compile check passes

## Success Criteria
- `renderMockupPng()` produces PNG file at specified path
- PNG shows mid-fidelity wireframe with red numbered circles
- Japanese text renders correctly (Noto Sans JP loaded)
- 2x scale factor produces crisp text
- Graceful fallback when Playwright not available
- Browser launched once for batch of screens

## Risk Assessment
- **Playwright install size (~50MB chromium)**: Document in README, make rendering optional
- **Google Fonts blocked in air-gapped env**: CSS fallback to system-ui; optionally bundle font file
- **CI/Docker missing browser deps**: Use `playwright install --with-deps chromium` in CI
- **Memory usage for many screens**: Close pages after each render, keep only browser alive

## Security Considerations
- Playwright runs headless Chromium — sandboxed by default
- HTML content is generated internally (not user-supplied URLs)
- No network requests except Google Fonts CDN
- `--no-sandbox` flag only for CI environments (not default)

## Next Steps
- Phase 4 wires `renderScreenDesign()` into the generation pipeline
- Phase 5 writes tests for the full render flow
