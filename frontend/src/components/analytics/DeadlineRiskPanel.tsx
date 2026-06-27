import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, TrendingDown, Zap, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

interface RiskTask {
  task_id:         string
  task_title:      string
  priority:        string
  deadline:        string
  hours_remaining: number
  risk_score:      number
  risk_level:      'medium' | 'high' | 'critical'
  factors:         string[]
  tip:             string | null
  status:          string
}

interface RiskData {
  at_risk:            RiskTask[]
  total_active_tasks: number
  on_time_rate_pct:   number | null
  tasks_analyzed:     number
}

const LEVEL_STYLE = {
  critical: { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', label: 'CRITICAL', icon: <AlertTriangle size={12} /> },
  high:     { bg: '#fff7ed', border: '#fdba74', color: '#ea580c', label: 'HIGH RISK', icon: <TrendingDown size={12} /> },
  medium:   { bg: '#fefce8', border: '#fde047', color: '#ca8a04', label: 'WATCH',     icon: <Clock size={12} /> },
}

function fmtRemaining(hours: number): string {
  if (hours < 0)   return 'OVERDUE'
  if (hours < 1)   return `${Math.round(hours * 60)}m left`
  if (hours < 24)  return `${Math.round(hours)}h left`
  return `${Math.round(hours / 24)}d left`
}

function RiskBadge({ level }: { level: 'medium' | 'high' | 'critical' }) {
  const s = LEVEL_STYLE[level]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: '0.06em',
    }}>
      {s.icon} {s.label}
    </span>
  )
}

export function DeadlineRiskPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'deadline-risk'],
    queryFn: async () => {
      const { data } = await api.get<RiskData>('/analytics/deadline-risk')
      return data
    },
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  })

  if (isLoading) {
    return (
      <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: 24 }}>
        <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 12, borderRadius: 8 }} />
        {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 10, borderRadius: 10 }} />)}
      </div>
    )
  }

  if (!data) return null

  const { at_risk, on_time_rate_pct, total_active_tasks } = data
  const criticalCount = at_risk.filter(r => r.risk_level === 'critical').length

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 22px', borderBottom: '1.5px solid var(--border)',
        background: criticalCount > 0 ? '#fef2f2' : 'var(--cream-dark)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: criticalCount > 0 ? '#dc2626' : 'var(--sidebar)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={18} color={criticalCount > 0 ? '#fff' : 'var(--yellow)'} />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em' }}>
              Deadline Predictor
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 1 }}>
              based on your completion history
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', color: at_risk.length > 0 ? '#dc2626' : '#16a34a' }}>
              {at_risk.length}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              at risk
            </div>
          </div>
          {on_time_rate_pct !== null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', color: on_time_rate_pct >= 70 ? '#16a34a' : '#ea580c' }}>
                {on_time_rate_pct}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                on-time rate
              </div>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>{total_active_tasks}</div>
            <div style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              active
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div style={{ padding: '14px 22px 18px' }}>
        {at_risk.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: '#16a34a' }}>You're on track!</p>
            <p style={{ fontSize: 13, color: 'var(--gray)' }}>
              {total_active_tasks > 0
                ? `${total_active_tasks} active task${total_active_tasks !== 1 ? 's' : ''}, none flagged at risk.`
                : 'No active tasks. Add some to get predictions.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {at_risk.map(task => {
              const ls = LEVEL_STYLE[task.risk_level]
              return (
                <Link
                  key={task.task_id}
                  to="/tasks"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    borderRadius: 12, border: `1.5px solid ${ls.border}`,
                    background: ls.bg, padding: '12px 14px',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${ls.border}88`
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--black)', lineHeight: 1.3, flex: 1 }}>
                        {task.task_title}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <RiskBadge level={task.risk_level} />
                        <span style={{
                          fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
                          color: task.hours_remaining < 0 ? '#dc2626' : task.hours_remaining < 4 ? '#ea580c' : 'var(--gray)',
                        }}>
                          {fmtRemaining(task.hours_remaining)}
                        </span>
                      </div>
                    </div>

                    {/* Risk bar */}
                    <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${task.risk_score * 100}%`, background: ls.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>

                    {/* Factors */}
                    {task.factors.length > 0 && (
                      <p style={{ fontSize: 12, color: ls.color, fontWeight: 600, marginBottom: task.tip ? 6 : 0, lineHeight: 1.4 }}>
                        {task.factors[0]}
                      </p>
                    )}

                    {/* AI tip */}
                    {task.tip && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 4, padding: '6px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 8 }}>
                        <Zap size={11} color={ls.color} style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.4, margin: 0 }}>{task.tip}</p>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {at_risk.length > 0 && (
        <div style={{ padding: '0 22px 14px' }}>
          <p style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.5 }}>
            Predictions based on your {data.tasks_analyzed} historical tasks. Click any task to act on it.
          </p>
        </div>
      )}
    </div>
  )
}
