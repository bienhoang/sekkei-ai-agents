import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendLineChartProps {
  data: { date: string; value: number }[]
  label: string
  color?: string
  height?: number
}

export function TrendLineChart({ data, label, color = '#2563eb', height = 200 }: TrendLineChartProps) {
  if (data.length < 2) return null

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{label} Trend</h4>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
