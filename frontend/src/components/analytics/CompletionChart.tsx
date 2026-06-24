import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useCompletionRate } from '../../hooks/useAnalytics'
import { Skeleton } from '../ui/Skeleton'

interface CompletionPoint {
  label: string
  rate: number
}

export function CompletionChart() {
  const { data, isLoading } = useCompletionRate('week')

  if (isLoading) return <Skeleton className="h-64 w-full" />

  const points: CompletionPoint[] = Array.isArray(data) ? data : []

  return (
    <div className="h-64 w-full rounded-xl border border-border p-4">
      <h3 className="mb-2 text-sm font-medium text-text-h">Completion Rate</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" stroke="var(--text)" fontSize={12} />
          <YAxis stroke="var(--text)" fontSize={12} />
          <Tooltip />
          <Line type="monotone" dataKey="rate" stroke="var(--accent)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
