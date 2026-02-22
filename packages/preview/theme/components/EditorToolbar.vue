<script setup lang="ts">
defineProps<{
  saving?: boolean
  isDirty?: boolean
}>()

const emit = defineEmits<{
  save: []
  cancel: []
  discard: []
}>()

function handleDiscard() {
  if (window.confirm('Discard all changes? This will reload the original content.')) {
    emit('discard')
  }
}
</script>

<template>
  <div class="sekkei-toolbar">
    <div class="sekkei-toolbar-left">
      <span class="sekkei-toolbar-label">Editing</span>
      <span v-if="isDirty" class="sekkei-toolbar-dirty">Unsaved changes</span>
    </div>
    <div class="sekkei-toolbar-right">
      <button
        class="sekkei-toolbar-btn sekkei-btn-discard"
        :disabled="saving"
        @click="handleDiscard"
      >
        Discard
      </button>
      <button
        class="sekkei-toolbar-btn sekkei-btn-cancel"
        :disabled="saving"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        class="sekkei-toolbar-btn sekkei-btn-save"
        :disabled="saving"
        @click="emit('save')"
      >
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.sekkei-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-soft, #f6f6f7);
  border-bottom: 1px solid var(--vp-c-divider, #e2e8f0);
  position: sticky;
  top: var(--vp-nav-height, 64px);
  z-index: 50;
}

.sekkei-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sekkei-toolbar-label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
}

.sekkei-toolbar-dirty {
  font-size: 0.75rem;
  color: #f59e0b;
  font-weight: 500;
}

.sekkei-toolbar-right {
  display: flex;
  gap: 0.5rem;
}

.sekkei-toolbar-btn {
  padding: 0.35rem 0.9rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s;
}

.sekkei-btn-save {
  background: var(--vp-c-brand-1, #3451b2);
  color: #fff;
}

.sekkei-btn-save:hover:not(:disabled) {
  background: var(--vp-c-brand-2, #3a5ccc);
}

.sekkei-btn-cancel {
  background: var(--vp-c-bg, #fff);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}

.sekkei-btn-cancel:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
}

.sekkei-btn-discard {
  background: transparent;
  color: var(--vp-c-danger-1, #e53e3e);
  border-color: var(--vp-c-danger-1, #e53e3e);
}

.sekkei-btn-discard:hover:not(:disabled) {
  background: rgba(229, 62, 62, 0.08);
}

.sekkei-toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
