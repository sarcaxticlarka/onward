import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useTaskStore } from '../../stores/taskStore'

const COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

export function PriorityPieChart() {
  const tasks = useTaskStore((state) => state.tasks)

  const counts = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.priority] = (acc[task.priority] ?? 0) + 1
    return acc
  }, {})

  const data = Object.entries(counts).map(([name, value]) => ({ name, value }))

  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-border text-sm text-text">
        No task data yet
      </div>
    )
  }

  return (
    <div className="h-64 w-full rounded-xl border border-border p-4">
      <h3 className="mb-2 text-sm font-medium text-text-h">Priority Distribution</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] ?? '#999'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
