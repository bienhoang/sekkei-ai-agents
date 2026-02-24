import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  flowchart: { htmlLabels: true },
})

let counter = 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CodeBlockView({ node }: any) {
  const language = node.attrs.language || ''

  if (language === 'mermaid') {
    return (
      <NodeViewWrapper className="mermaid-wrapper not-prose my-4">
        <MermaidDiagram code={node.textContent} />
        {/* Hidden contentDOM keeps ProseMirror happy */}
        <pre className="sr-only" aria-hidden="true">
          <NodeViewContent />
        </pre>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper
      as="pre"
      data-language={language}
      spellCheck={false}
      className="code-block not-prose rounded-lg my-4 overflow-x-auto text-sm leading-relaxed"
    >
      {language && (
        <span className="code-lang-badge">{language}</span>
      )}
      <NodeViewContent />
    </NodeViewWrapper>
  )
}

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const idRef = useRef(`m-${++counter}`)

  useEffect(() => {
    const trimmed = code.trim()
    if (!trimmed) return

    // Convert \n to <br/> for line breaks in mermaid node labels
    const processed = trimmed.replace(/\\n/g, '<br/>')
    const id = `${idRef.current}-${++counter}`
    mermaid.render(id, processed)
      .then(result => { setSvg(result.svg); setError('') })
      .catch(err => { setSvg(''); setError(String(err)) })
  }, [code])

  if (error) {
    return (
      <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-lg">
        <div className="text-[11px] text-red-400/70 font-medium mb-1">Mermaid Error</div>
        <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500 text-xs">
        <span className="animate-pulse">Rendering diagram…</span>
      </div>
    )
  }

  return (
    <div
      className="mermaid-diagram flex justify-center py-4 px-2 bg-zinc-800/40 rounded-lg border border-zinc-700/30"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
