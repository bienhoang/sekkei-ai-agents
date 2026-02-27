import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

interface CompletionDonutProps {
  completed: number
  inProgress: number
  pending: number
}

const COLORS = ['#16a34a', '#2563eb', '#94a3b8']
const LABELS = ['Complete', 'In Progress', 'Pending']

export function CompletionDonut({ completed, inProgress, pending }: CompletionDonutProps) {
  const total = completed + inProgress + pending
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const chartData = [
    { name: LABELS[0], value: completed },
    { name: LABELS[1], value: inProgress },
    { name: LABELS[2], value: pending },
  ]

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Completion</h3>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius="55%"
              outerRadius="75%"
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} stroke="none" />
              ))}
            </Pie>
            <Tooltip />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 4 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 28 }}>
          <span className="text-3xl font-bold">{pct}%</span>
        </div>
      </div>
    </div>
  )
}
