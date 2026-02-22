<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MilkdownEditor from './MilkdownEditor.vue'
import { useFileApi } from '../composables/use-file-api'

const props = defineProps<{
  filePath: string
}>()

const emit = defineEmits<{
  change: []
}>()

const content = ref('')
const loading = ref(true)
const error = ref('')
const editorRef = ref<InstanceType<typeof MilkdownEditor> | null>(null)
const currentMarkdown = ref('')

const { read, save } = useFileApi()

onMounted(async () => {
  try {
    const result = await read(props.filePath)
    content.value = result.content
    currentMarkdown.value = result.content
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
})

function onEditorChange(markdown: string) {
  currentMarkdown.value = markdown
  emit('change')
}

async function saveContent(): Promise<void> {
  const markdown = editorRef.value?.getMarkdown() ?? currentMarkdown.value
  await save(props.filePath, markdown)
}

function getMarkdown(): string {
  return editorRef.value?.getMarkdown() ?? currentMarkdown.value
}

defineExpose({ save: saveContent, getMarkdown })
</script>

<template>
  <div class="sekkei-editor-wrapper">
    <div v-if="loading" class="editor-loading">
      <span>Loading editor...</span>
    </div>
    <div v-else-if="error" class="editor-error">
      <span>Failed to load: {{ error }}</span>
    </div>
    <ClientOnly v-else>
      <template #fallback>
        <div class="editor-loading">Loading editor...</div>
      </template>
      <MilkdownEditor
        ref="editorRef"
        :initial-value="content"
        @change="onEditorChange"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
.sekkei-editor-wrapper {
  min-height: 400px;
  background: var(--vp-c-bg, #fff);
  border: 1px solid var(--vp-c-divider, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

.editor-loading,
.editor-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--vp-c-text-2, #666);
  font-size: 0.9rem;
}

.editor-error {
  color: var(--vp-c-danger-1, #e53e3e);
}
</style>
