<script setup lang="ts">
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/vue'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { getMarkdown } from '@milkdown/kit/utils'
import '@milkdown/theme-nord/style.css'
import { ref } from 'vue'

const props = defineProps<{
  initialValue: string
}>()

const emit = defineEmits<{
  change: [markdown: string]
}>()

const editorRef = ref<Editor | null>(null)

useEditor((root) => {
  return Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.initialValue)
      ctx.set(listenerCtx, {
        markdownUpdated: (_ctx, markdown) => {
          emit('change', markdown)
        },
      })
    })
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(listener)
    .create()
    .then((editor) => {
      editorRef.value = editor
      return editor
    })
})

function getEditorMarkdown(): string {
  if (!editorRef.value) return props.initialValue
  return editorRef.value.action(getMarkdown())
}

defineExpose({ getMarkdown: getEditorMarkdown })
</script>

<template>
  <MilkdownProvider>
    <Milkdown />
  </MilkdownProvider>
</template>

<style scoped>
:deep(.milkdown) {
  min-height: 400px;
  padding: 1rem;
}

:deep(.milkdown .editor) {
  outline: none;
}

:deep(.milkdown table) {
  width: 100%;
  border-collapse: collapse;
}

:deep(.milkdown th),
:deep(.milkdown td) {
  border: 1px solid var(--vp-c-divider, #e2e8f0);
  padding: 0.5rem 0.75rem;
}
</style>
