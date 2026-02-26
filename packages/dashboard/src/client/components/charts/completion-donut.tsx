import { Doughnut } from 'react-chartjs-2'

interface CompletionDonutProps {
  completed: number
  inProgress: number
  pending: number
}

export function CompletionDonut({ completed, inProgress, pending }: CompletionDonutProps) {
  const total = completed + inProgress + pending
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const data = {
    labels: ['Complete', 'In Progress', 'Pending'],
    datasets: [{
      data: [completed, inProgress, pending],
      backgroundColor: ['#16a34a', '#2563eb', '#94a3b8'],
      borderWidth: 0,
    }],
  }

  const options = {
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 12 } },
    },
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Completion</h3>
      <div className="relative h-52">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 28 }}>
          <span className="text-3xl font-bold">{pct}%</span>
        </div>
      </div>
    </div>
  )
}
