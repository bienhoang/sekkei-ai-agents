import { ref, computed, provide, inject, type Ref, type InjectionKey } from 'vue'

export type EditState = 'view' | 'loading' | 'editing' | 'saving'

interface EditModeContext {
  state: Ref<EditState>
  isDirty: Ref<boolean>
  isEditing: Ref<boolean>
  startEdit: () => void
  cancelEdit: () => void
  setSaving: () => void
  setView: () => void
  setEditing: () => void
  markDirty: () => void
  clearDirty: () => void
}

const EDIT_MODE_KEY: InjectionKey<EditModeContext> = Symbol('sekkei-edit-mode')

/**
 * Provide edit mode state in Layout component.
 */
export function provideEditMode(): EditModeContext {
  const state = ref<EditState>('view')
  const isDirty = ref(false)

  const isEditing = computed(() =>
    state.value === 'editing' || state.value === 'loading' || state.value === 'saving'
  )

  const ctx: EditModeContext = {
    state,
    isDirty,
    isEditing,
    startEdit: () => { state.value = 'loading' },
    cancelEdit: () => { state.value = 'view'; isDirty.value = false },
    setSaving: () => { state.value = 'saving' },
    setView: () => { state.value = 'view'; isDirty.value = false },
    setEditing: () => { state.value = 'editing' },
    markDirty: () => { isDirty.value = true },
    clearDirty: () => { isDirty.value = false },
  }

  provide(EDIT_MODE_KEY, ctx)
  return ctx
}

/**
 * Inject edit mode state in child components.
 */
export function useEditMode(): EditModeContext {
  const ctx = inject(EDIT_MODE_KEY)
  if (!ctx) throw new Error('useEditMode() called outside of provideEditMode()')
  return ctx
}
