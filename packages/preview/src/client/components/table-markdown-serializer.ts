/**
 * Custom table markdown serializer that fixes data loss when cells contain
 * multiple paragraphs (line breaks). The default tiptap-markdown serializer
 * falls back to HTMLNode when cell.childCount > 1, which outputs "[table]"
 * when html mode is disabled — destroying all table data.
 *
 * Fix: serialize multi-paragraph cells using <br> (standard GFM approach).
 * Also temporarily enables html mode during table serialization so that
 * hardBreak nodes serialize as <br> instead of "[hardBreak]".
 */
import { Table } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

/** Get child nodes from a ProseMirror node */
function childNodes(node: ProseMirrorNode): ProseMirrorNode[] {
  const children: ProseMirrorNode[] = []
  node.forEach((child) => children.push(child))
  return children
}

/** Check if a cell has colspan/rowspan */
function hasSpan(node: ProseMirrorNode): boolean {
  return (node.attrs.colspan ?? 1) > 1 || (node.attrs.rowspan ?? 1) > 1
}

/**
 * Render cell content to markdown.
 * Multi-child cells join paragraphs with <br>.
 */
function renderCellContent(state: any, cell: ProseMirrorNode): void {
  const children = childNodes(cell)
  if (children.length === 0) return

  children.forEach((child, idx) => {
    if (idx > 0) state.write('<br>')
    if (child.textContent.trim() || child.childCount > 0) {
      state.renderInline(child)
    }
  })
}

/**
 * Table extension with overridden markdown serializer.
 * Handles multi-paragraph cells gracefully instead of outputting "[table]".
 */
export const SafeTable = Table.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(this: any, state: any, node: ProseMirrorNode) {
          const rows = childNodes(node)
          if (rows.length === 0) return

          // Temporarily enable html so that inline nodes like hardBreak
          // serialize as <br> instead of "[hardBreak]" during table rendering
          const mdOpts = this.editor?.storage?.markdown?.options
          const origHtml = mdOpts?.html
          if (mdOpts) mdOpts.html = true

          try {
            state.inTable = true
            const firstRow = rows[0]
            const bodyRows = rows.slice(1)

            // Render header row
            if (firstRow) {
              state.write('| ')
              const headerCells = childNodes(firstRow)
              headerCells.forEach((cell, j) => {
                if (j) state.write(' | ')
                renderCellContent(state, cell)
              })
              state.write(' |')
              state.ensureNewLine()

              // Delimiter row
              const colCount = headerCells.length
              const delimiter = Array.from({ length: colCount }, () => '---').join(' | ')
              state.write(`| ${delimiter} |`)
              state.ensureNewLine()
            }

            // Render body rows
            bodyRows.forEach((row) => {
              state.write('| ')
              const cells = childNodes(row)
              cells.forEach((cell, j) => {
                if (j) state.write(' | ')
                renderCellContent(state, cell)
              })
              state.write(' |')
              state.ensureNewLine()
            })

            state.closeBlock(node)
          } finally {
            state.inTable = false
            // Restore original html setting
            if (mdOpts) mdOpts.html = origHtml
          }
        },
        parse: {
          // handled by markdown-it
        },
      },
    }
  },
})
