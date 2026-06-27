import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useCompletionRate } from '../../hooks/useAnalytics'

interface CompletionPoint { label: string; rate: number }

export function CompletionChart() {
  const { data, isLoading, isError } = useCompletionRate('week')

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '20px 24px', background: 'var(--white)' }}>
      <p className="section-label" style={{ marginBottom: 4 }}>completion rate</p>
      <p style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 16 }}>Weekly Progress</p>

      {isLoading && (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skeleton" style={{ width: '100%', height: 180, borderRadius: 10 }} />
        </div>
      )}
      {isError && (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--danger)' }}>Could not load completion data.</p>
        </div>
      )}
      {!isLoading && !isError && (() => {
        const points: CompletionPoint[] = Array.isArray(data) ? data : []
        if (points.length === 0) {
          return (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', borderRadius: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--gray)' }}>No data yet — complete some tasks to see trends.</p>
            </div>
          )
        }
        return (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--gray)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--gray)' }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }}
                  formatter={(v) => [`${v}%`, 'Completion']}
                />
                <Line type="monotone" dataKey="rate" stroke="var(--sidebar)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--sidebar)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })()}
    </div>
  )
}
