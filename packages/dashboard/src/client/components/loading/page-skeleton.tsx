export function CardSkeleton() {
  return <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
      ))}
    </div>
  )
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <TableSkeleton rows={rows} />
    </div>
  )
}
