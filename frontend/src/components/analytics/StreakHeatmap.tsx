import { useQuery } from '@tanstack/react-query'
import { Flame, Trophy, Calendar, Target } from 'lucide-react'
import api from '../../lib/api'

interface Cell { date: string; count: number }
interface StreakData {
  grid: Cell[]
  current_streak: number
  longest_streak: number
  total_days_active: number
  total_completed: number
}

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function cellColor(count: number): string {
  if (count === 0) return 'var(--border)'
  if (count === 1) return '#a78bfa'   // light purple
  if (count === 2) return '#7c3aed'   // medium purple
  if (count <= 4)  return '#4c1d95'   // dark purple
  return 'var(--sidebar)'             // deepest = sidebar color
}

function getMonthLabels(grid: Cell[]) {
  const weeks = chunkWeeks(grid)
  const labels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const firstDay = week.find(c => c)
    if (!firstDay) return
    const m = new Date(firstDay.date).getMonth()
    if (m !== lastMonth) {
      labels.push({ label: MONTHS[m], col: wi })
      lastMonth = m
    }
  })
  return labels
}

function chunkWeeks(grid: Cell[]): Cell[][] {
  const weeks: Cell[][] = []
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7))
  }
  return weeks
}

export function StreakHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'streak'],
    queryFn: async () => {
      const { data } = await api.get<StreakData>('/analytics/streak')
      return data
    },
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: 24 }}>
        <div className="skeleton" style={{ height: 140, borderRadius: 10 }} />
      </div>
    )
  }

  if (!data) return null

  const weeks       = chunkWeeks(data.grid)
  const monthLabels = getMonthLabels(data.grid)

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 24px 14px', borderBottom: '1.5px solid var(--border)', background: 'var(--cream-dark)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 2 }}>Activity Streak</div>
            <div style={{ fontSize: 12, color: 'var(--gray)' }}>tasks completed per day — last 365 days</div>
          </div>
          {/* Streak stats */}
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { icon: <Flame size={14} color="#ef4444" />, label: 'current streak', value: `${data.current_streak}d` },
              { icon: <Trophy size={14} color="#d97706" />, label: 'longest streak', value: `${data.longest_streak}d` },
              { icon: <Target size={14} color="var(--sidebar)" />, label: 'active days', value: data.total_days_active },
              { icon: <Calendar size={14} color="var(--blue)" />, label: 'total done', value: data.total_completed },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 2 }}>
                  {s.icon} {s.value}
                </div>
                <div style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div style={{ padding: '20px 24px 20px', overflowX: 'auto' }}>
        <div style={{ minWidth: 640 }}>
          {/* Month labels */}
          <div style={{ display: 'flex', marginLeft: 28, marginBottom: 4 }}>
            {monthLabels.map(({ label, col }) => (
              <div
                key={`${label}-${col}`}
                style={{ position: 'absolute', marginLeft: col * 14, fontSize: 10, color: 'var(--gray)', fontWeight: 700 }}
              >
                {label}
              </div>
            ))}
            {/* Spacer so month labels don't overlap the grid */}
            <div style={{ height: 14 }} />
          </div>

          <div style={{ display: 'flex', gap: 2, marginLeft: 28, position: 'relative' }}>
            {/* Month label row overlay */}
            <div style={{ position: 'absolute', top: -16, left: 0, display: 'flex', pointerEvents: 'none' }}>
              {monthLabels.map(({ label, col }) => (
                <div key={`${label}-${col}`} style={{ position: 'absolute', left: col * 14, fontSize: 10, color: 'var(--gray)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {label}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {week.map((cell, di) => {
                  const isEmpty = cell.count === 0
                  const title   = `${cell.date}: ${cell.count} task${cell.count !== 1 ? 's' : ''} completed`
                  return (
                    <div
                      key={di}
                      title={title}
                      style={{
                        width: 12, height: 12, borderRadius: 3,
                        background: cellColor(cell.count),
                        opacity: isEmpty ? 0.35 : 1,
                        cursor: cell.count > 0 ? 'pointer' : 'default',
                        transition: 'transform 0.1s',
                      }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.4)' }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)' }}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'absolute', marginTop: -96, marginLeft: 0 }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ height: 12, fontSize: 9, color: 'var(--gray)', display: i % 2 === 1 ? 'flex' : 'none', alignItems: 'center', lineHeight: '12px', fontWeight: 700 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'var(--gray)' }}>less</span>
            {[0, 1, 2, 3, 4].map(n => (
              <div key={n} style={{ width: 12, height: 12, borderRadius: 3, background: cellColor(n), opacity: n === 0 ? 0.35 : 1 }} />
            ))}
            <span style={{ fontSize: 10, color: 'var(--gray)' }}>more</span>
          </div>
        </div>
      </div>

      {/* Streak milestones */}
      {data.current_streak > 0 && (
        <div style={{ padding: '12px 24px 16px', borderTop: '1.5px solid var(--border)', background: 'var(--cream-dark)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { days: 3,  label: '3-day streak',  emoji: '🔥' },
            { days: 7,  label: '1 week',         emoji: '⚡' },
            { days: 14, label: '2 weeks',        emoji: '💪' },
            { days: 30, label: '1 month',        emoji: '🏆' },
          ].map(m => {
            const reached = data.current_streak >= m.days
            return (
              <div key={m.days} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
                background: reached ? 'var(--sidebar)' : 'var(--border)',
                color: reached ? '#fff' : 'var(--gray)',
                fontSize: 12, fontWeight: 700, opacity: reached ? 1 : 0.5,
              }}>
                {m.emoji} {m.label}
              </div>
            )
          })}
          {data.current_streak >= 3 && (
            <div style={{ fontSize: 12, color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <Flame size={12} color="#ef4444" /> Keep going — {data.current_streak} day streak!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
