import { useFocusHeatmap } from '../../hooks/useAnalytics'

interface HeatmapCell { day: string; hour: number; intensity: number }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function intensityToColor(intensity: number): string {
  if (intensity > 0.75) return 'var(--sidebar)'
  if (intensity > 0.5)  return 'rgba(26,14,48,0.65)'
  if (intensity > 0.25) return 'rgba(26,14,48,0.35)'
  if (intensity > 0)    return 'rgba(26,14,48,0.15)'
  return 'var(--cream)'
}

export function FocusHeatmap() {
  const { data, isLoading, isError } = useFocusHeatmap()

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '20px 24px', background: 'var(--white)' }}>
      <p className="section-label" style={{ marginBottom: 4 }}>focus patterns</p>
      <p style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 16 }}>Heatmap by Day & Hour</p>

      {isLoading && <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />}
      {isError && <p style={{ fontSize: 13, color: 'var(--danger)' }}>Could not load heatmap.</p>}

      {!isLoading && !isError && (() => {
        const cells: HeatmapCell[] = Array.isArray(data) ? data : []

        if (cells.length === 0) {
          return (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', borderRadius: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--gray)' }}>No activity tracked yet.</p>
            </div>
          )
        }

        // Build lookup: {day: {hour: intensity}}
        const lookup: Record<string, Record<number, number>> = {}
        for (const cell of cells) {
          if (!lookup[cell.day]) lookup[cell.day] = {}
          lookup[cell.day][cell.hour] = cell.intensity
        }

        return (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 560 }}>
              {/* Hour labels */}
              <div style={{ display: 'flex', marginBottom: 4, marginLeft: 38 }}>
                {HOURS.filter(h => h % 3 === 0).map(h => (
                  <div key={h} style={{ flex: 1, textAlign: 'left', fontSize: 10, color: 'var(--gray)', minWidth: 0 }}>{h}h</div>
                ))}
              </div>
              {DAYS.map(day => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, gap: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 700, width: 34, flexShrink: 0 }}>{day}</span>
                  {HOURS.map(hour => {
                    const intensity = lookup[day]?.[hour] ?? 0
                    return (
                      <div
                        key={hour}
                        title={`${day} ${hour}:00 — ${Math.round(intensity * 100)}% focus`}
                        style={{
                          flex: 1, height: 18, borderRadius: 3,
                          background: intensityToColor(intensity),
                          border: '1px solid var(--border)',
                          cursor: 'default',
                          transition: 'opacity 0.1s',
                        }}
                      />
                    )
                  })}
                </div>
              ))}
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--gray)' }}>less</span>
                {[0, 0.25, 0.5, 0.75, 1].map(i => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: intensityToColor(i), border: '1px solid var(--border)' }} />
                ))}
                <span style={{ fontSize: 11, color: 'var(--gray)' }}>more</span>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
