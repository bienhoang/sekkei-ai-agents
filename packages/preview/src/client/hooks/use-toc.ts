import { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/react'

export interface TocItem {
  text: string
  level: number
}

export function useToc(editor: Editor | null, scrollContainer: HTMLElement | null) {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  const extractHeadings = useCallback(() => {
    if (!editor) return
    const json = editor.getJSON()
    const headings: TocItem[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any) {
      if (node.type === 'heading' && (node.attrs?.level === 2 || node.attrs?.level === 3)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = node.content?.map((c: any) => c.text || '').join('') || ''
        if (text) headings.push({ text, level: node.attrs.level })
      }
      if (node.content) node.content.forEach(walk)
    }

    json.content?.forEach(walk)
    setItems(headings)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    extractHeadings()
    editor.on('update', extractHeadings)
    return () => { editor.off('update', extractHeadings) }
  }, [editor, extractHeadings])

  // Scroll-spy via scroll event on the container
  useEffect(() => {
    if (!scrollContainer || items.length === 0) return

    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const headings = scrollContainer.querySelectorAll('h2, h3')
        const threshold = scrollContainer.getBoundingClientRect().top + 100
        let active = -1

        for (let i = 0; i < headings.length; i++) {
          if (headings[i].getBoundingClientRect().top <= threshold) active = i
        }

        setActiveIndex(active)
        ticking = false
      })
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [scrollContainer, items])

  const scrollTo = useCallback((index: number) => {
    if (!scrollContainer) return
    const headings = scrollContainer.querySelectorAll('h2, h3')
    headings[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [scrollContainer])

  return { items, activeIndex, scrollTo }
}
