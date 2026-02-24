import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import tippy from 'tippy.js'
import type { Instance as TippyInstance } from 'tippy.js'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react'
import { slashMenuItems } from './slash-menu-items.js'
import type { SlashMenuItem } from './slash-menu-items.js'

/* ── Popup Component ── */

interface PopupProps {
  items: SlashMenuItem[]
  command: (item: SlashMenuItem) => void
}

interface PopupRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

const SlashMenuPopup = forwardRef<PopupRef, PopupProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => setSelectedIndex(0), [items])

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index]
      if (item) command(item)
    },
    [items, command],
  )

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      if (event.key === 'Escape') return true
      return false
    },
  }))

  if (!items.length) {
    return (
      <div className="slash-menu bg-[var(--c-bg-mute)] border border-[var(--c-divider)] rounded-lg shadow-xl p-3 text-xs text-[var(--c-text-3)]">
        No results
      </div>
    )
  }

  return (
    <div className="slash-menu bg-[var(--c-bg-mute)] border border-[var(--c-divider)] rounded-lg shadow-xl py-1.5 overflow-y-auto max-h-80 min-w-[220px]">
      {items.map((item, index) => (
        <button
          key={item.title}
          onClick={() => selectItem(index)}
          className={`slash-menu-item flex items-center gap-3 w-full text-left px-3 py-1.5 transition-colors ${
            index === selectedIndex
              ? 'bg-[var(--c-brand-soft)] text-[var(--c-text-1)]'
              : 'text-[var(--c-text-2)] hover:bg-[var(--c-bg-alt)]'
          }`}
        >
          <span className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--c-bg-soft)] text-xs font-mono shrink-0">
            {item.icon}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{item.title}</div>
            <div className="text-[10px] text-[var(--c-text-3)] truncate">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
})

SlashMenuPopup.displayName = 'SlashMenuPopup'

/* ── TipTap Extension ── */

type SuggestionConfig = Omit<SuggestionOptions, 'editor'>

export const SlashMenuExtension = Extension.create({
  name: 'slashMenu',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }: { editor: any; range: any; props: SlashMenuItem }) => {
          props.command(editor, range)
        },
        allow: ({ editor }: { editor: any }) => {
          return !editor.isActive('codeBlock')
        },
        items: ({ query }: { query: string }) => {
          const q = query.toLowerCase()
          return slashMenuItems.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q),
          )
        },
        render: () => {
          let component: ReactRenderer<PopupRef> | null = null
          let popup: TippyInstance | null = null

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(SlashMenuPopup, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              })

              const el = props.decorationNode ?? props.editor.view.dom
              popup = tippy(el, {
                getReferenceClientRect: () => props.clientRect?.() ?? el.getBoundingClientRect(),
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                maxWidth: 320,
              })
            },

            onUpdate: (props: SuggestionProps) => {
              component?.updateProps({ items: props.items, command: props.command })
              popup?.setProps({
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? props.editor.view.dom.getBoundingClientRect(),
              })
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit: () => {
              popup?.destroy()
              component?.destroy()
              popup = null
              component = null
            },
          }
        },
      } satisfies SuggestionConfig,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
