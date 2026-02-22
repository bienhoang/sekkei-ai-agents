<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import EditButton from './EditButton.vue'
import EditorToolbar from './EditorToolbar.vue'
import MilkdownWrapper from './MilkdownWrapper.vue'
import { provideEditMode } from '../composables/use-edit-mode'

const { page, theme } = useData()
const editEnabled = computed(() => (theme.value as any).editMode === true)
const currentPath = computed(() => page.value.relativePath)

const {
  state,
  isDirty,
  isEditing,
  startEdit,
  cancelEdit,
  setSaving,
  setView,
  setEditing,
  markDirty,
} = provideEditMode()

const editorRef = ref<InstanceType<typeof MilkdownWrapper> | null>(null)

// When startEdit triggers loading, fetch file then switch to editing
watch(state, async (newState) => {
  if (newState === 'loading') {
    setEditing()
  }
})

// Reset edit state when navigating to different page
watch(currentPath, () => {
  if (isEditing.value) {
    cancelEdit()
  }
})

async function handleSave() {
  setSaving()
  try {
    await editorRef.value?.save()
    setView()
  } catch (err) {
    console.error('Save failed:', err)
    setEditing()
  }
}

function handleCancel() {
  cancelEdit()
}

function handleDiscard() {
  cancelEdit()
}

function onEditorChange() {
  markDirty()
}

// Keyboard shortcut: Ctrl+S / Cmd+S
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (isEditing.value && state.value === 'editing') {
      handleSave()
    }
  }
}

// Unsaved changes warning
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <EditorToolbar
        v-if="isEditing"
        :saving="state === 'saving'"
        :is-dirty="isDirty"
        @save="handleSave"
        @cancel="handleCancel"
        @discard="handleDiscard"
      />
    </template>

    <template #doc-top>
      <div v-if="isEditing" class="sekkei-editor-container">
        <MilkdownWrapper
          ref="editorRef"
          :file-path="currentPath"
          @change="onEditorChange"
        />
      </div>
    </template>

    <template #doc-after>
      <EditButton
        v-if="editEnabled && !isEditing"
        :is-dirty="isDirty"
        @edit="startEdit"
      />
    </template>
  </DefaultTheme.Layout>
</template>

<style>
/* Hide rendered VitePress content when editing (inline replace) */
.sekkei-editor-container + .vp-doc > div {
  display: none;
}
</style>

<style scoped>
.sekkei-editor-container {
  margin: 0 -24px;
  padding: 0 24px;
}
</style>
