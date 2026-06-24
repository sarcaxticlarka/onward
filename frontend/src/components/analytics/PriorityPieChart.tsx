import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useTaskStore } from '../../stores/taskStore'

const COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#3b82f6',
  low:      '#6b7280',
}

export function PriorityPieChart() {
  const tasks = useTaskStore((state) => state.tasks)

  const counts = (tasks ?? []).reduce<Record<string, number>>((acc, task) => {
    const p = task.priority ?? 'medium'
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {})

  const data = Object.entries(counts).map(([name, value]) => ({ name, value }))

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '20px 24px', background: 'var(--white)' }}>
      <p className="section-label" style={{ marginBottom: 4 }}>by priority</p>
      <p style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 16 }}>Task Distribution</p>

      {data.length === 0 ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--gray)' }}>No tasks yet — add some to see the breakdown.</p>
        </div>
      ) : (
        <>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] ?? '#999'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }}
                  formatter={(v: number) => [v, 'tasks']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v: string) => <span style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend counts */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {data.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[d.name] ?? '#999', flexShrink: 0 }} />
                <span style={{ color: 'var(--gray)', fontWeight: 600 }}>{d.name}</span>
                <span style={{ color: 'var(--black)', fontWeight: 800 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
