# Milkdown v7 + VitePress (Vue 3) Integration Research

Date: 2026-02-21 | Status: Complete

---

## 1. Packages Required

```bash
npm install @milkdown/kit @milkdown/vue @milkdown/theme-nord
# GFM tables: included in @milkdown/kit/preset/gfm
# Slash commands: @milkdown/plugin-slash (separate or via kit)
```

Core imports from `@milkdown/kit` (v7 unified package):
- `@milkdown/kit/core` — `Editor`, `rootCtx`, `defaultValueCtx`
- `@milkdown/kit/preset/commonmark` — `commonmark`
- `@milkdown/kit/preset/gfm` — `gfm` (includes tables)
- `@milkdown/kit/plugin/listener` — `listener`, `listenerCtx`
- `@milkdown/vue` — `useEditor`, `MilkdownProvider`, `Milkdown`

---

## 2. Vue 3 Component Pattern

```vue
<!-- MilkdownEditor.vue -->
<script setup lang="ts">
import { useEditor, Milkdown, MilkdownProvider } from '@milkdown/vue'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.modelValue)
      ctx.get(listenerCtx).markdownUpdated((_, markdown, prev) => {
        if (markdown !== prev) emit('update:modelValue', markdown)
      })
    })
    .use(commonmark)
    .use(gfm)          // GFM tables, task lists, strikethrough
    .use(listener)
    .create()
)
</script>

<template>
  <MilkdownProvider>
    <Milkdown />
  </MilkdownProvider>
</template>
```

Note: `useEditor` must be called inside a component wrapped by `MilkdownProvider`. When nesting, the `MilkdownProvider` wraps a child that calls `useEditor`.

Correct pattern — provider wraps sibling children:
```vue
<!-- Parent -->
<MilkdownProvider>
  <EditorInner />   <!-- calls useEditor -->
  <Toolbar />       <!-- calls useInstance() to access editor -->
</MilkdownProvider>
```

---

## 3. Serialize Content to Markdown String

Two methods:

**Via listener (reactive):** preferred approach — capture in `markdownUpdated` callback (see above).

**Via imperative get:**
```typescript
import { useInstance } from '@milkdown/vue'

const [loading, get] = useInstance()

function getMarkdown(): string {
  const editor = get()
  return editor?.getMarkdown() ?? ''
}
```

`editor.getMarkdown()` is the v7 high-level API. Internally uses `serializerCtx` — no need to call it directly.

---

## 4. YAML Frontmatter Handling

Milkdown parses markdown; YAML frontmatter (`---\n...\n---`) may be treated as a thematic break + paragraph. Strip before loading, re-attach on save.

```typescript
// utils/frontmatter.ts
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function splitFrontmatter(raw: string): { fm: string; body: string } {
  const m = raw.match(FRONTMATTER_RE)
  if (!m) return { fm: '', body: raw }
  return { fm: m[0], body: raw.slice(m[0].length) }
}

export function joinFrontmatter(fm: string, body: string): string {
  return fm ? `${fm}\n${body}` : body
}
```

Usage in parent component:
```typescript
const { fm, body } = splitFrontmatter(rawFileContent)
// pass `body` as modelValue to MilkdownEditor
// on save: joinFrontmatter(fm, editorMarkdown)
```

---

## 5. VitePress SSR — Client-Only Rendering

**Problem:** Milkdown accesses DOM/`window` on import; VitePress SSR-renders during `vitepress build`, causing "document is not defined" errors.

**Solution A — `<ClientOnly>` wrapper (simplest):**
```vue
<!-- In any VitePress .md or .vue theme component -->
<ClientOnly>
  <MilkdownEditor v-model="content" />
</ClientOnly>
```

**Solution B — `defineClientComponent` (VitePress built-in, v1.0+):**
```typescript
// .vitepress/theme/index.ts or composable
import { defineClientComponent } from 'vitepress'

const MilkdownEditor = defineClientComponent(() =>
  import('./MilkdownEditor.vue')
)
```
Component is only imported in `onMounted`, eliminating SSR import. Props/slots pass through normally.

**Solution C — dynamic import with `<Suspense>` (alternative):**
```vue
<script setup>
import { defineAsyncComponent } from 'vue'
const Editor = defineAsyncComponent(() => import('./MilkdownEditor.vue'))
</script>
<template>
  <ClientOnly><Editor /></ClientOnly>
</template>
```

Recommendation: use `<ClientOnly>` + `defineClientComponent` together for clean SSR isolation.

---

## 6. Slash Commands

`@milkdown/plugin-slash` is not in `@milkdown/kit` preset. Use `@milkdown/crepe` if slash commands needed — Crepe is Milkdown's opinionated full-featured build:
```bash
npm install @milkdown/crepe
```
```typescript
import { Crepe } from '@milkdown/crepe'
import { useEditor } from '@milkdown/vue'

useEditor((root) => new Crepe({ root, defaultValue: body }))
```
Crepe includes slash commands, tooltips, block handles, image upload out of the box. Still works with `useEditor`.

If minimal setup needed (no Crepe), slash is available via `@milkdown/plugin-slash` but requires manual configuration of menu items.

---

## Known Issues

- `useEditor` callback runs once on mount; changing `props.modelValue` after mount does NOT re-initialize — treat editor as uncontrolled, use listener for sync.
- GFM plugin conflicts: don't use both `commonmark` and `gfm` presets if `gfm` extends `commonmark` — check kit version; in some v7 builds `gfm` re-exports `commonmark` nodes.
- Theme import: `@milkdown/theme-nord` injects CSS globally; in VitePress ensure it loads only client-side or import in component (not in `vitepress build` SSR pass).

---

## Unresolved Questions

1. Does `@milkdown/kit/preset/gfm` re-export `commonmark` in latest v7.x — or must both be used?
2. Exact slash command API for `@milkdown/plugin-slash` without Crepe (menu item schema).
3. VitePress `defineClientComponent` slot forwarding behavior — needs testing with v-model.

---

Sources:
- [Vue | Milkdown](https://milkdown.dev/docs/recipes/vue)
- [Plugin Listener | Milkdown](https://milkdown.dev/docs/api/plugin-listener)
- [SSR Compatibility | VitePress](https://vitepress.dev/guide/ssr-compat)
- [Framework Integrations | DeepWiki](https://deepwiki.com/Milkdown/milkdown/6.4-framework-integrations)
