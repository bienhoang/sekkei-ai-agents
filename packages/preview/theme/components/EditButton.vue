<script setup lang="ts">
defineProps<{
  isDirty?: boolean
}>()

const emit = defineEmits<{
  edit: []
}>()
</script>

<template>
  <button
    class="sekkei-edit-btn"
    title="Edit this page"
    @click="emit('edit')"
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.442l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.442-.757l8.613-8.607zm1.414 1.06a.25.25 0 00-.354 0L3.46 11.1a.25.25 0 00-.063.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.063l8.613-8.613a.25.25 0 000-.354l-1.086-1.086z" fill="currentColor"/>
    </svg>
    <span>Edit</span>
    <span v-if="isDirty" class="sekkei-dirty-dot" />
  </button>
</template>

<style scoped>
.sekkei-edit-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: var(--vp-c-brand-1, #3451b2);
  color: #fff;
  border: none;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s, box-shadow 0.15s;
}

.sekkei-edit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.sekkei-edit-btn:active {
  transform: translateY(0);
}

.sekkei-dirty-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
}

@media (max-width: 768px) {
  .sekkei-edit-btn {
    bottom: 1rem;
    right: 1rem;
  }
}
</style>
