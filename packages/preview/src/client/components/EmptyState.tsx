export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[var(--c-text-3)] select-none gap-4">
      <svg className="w-14 h-14 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <div className="text-center">
        <p className="text-sm text-[var(--c-text-2)]">Select a document</p>
        <p className="text-xs text-[var(--c-text-4)] mt-1">Choose a file from the sidebar to preview</p>
      </div>
    </div>
  )
}
