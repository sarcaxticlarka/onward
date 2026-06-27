import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { StreakHeatmap } from '../components/analytics/StreakHeatmap'
import { DeadlineRiskPanel } from '../components/analytics/DeadlineRiskPanel'
import { CompletionChart } from '../components/analytics/CompletionChart'
import { PriorityPieChart } from '../components/analytics/PriorityPieChart'
import { FocusHeatmap } from '../components/analytics/FocusHeatmap'
import { WeeklySummaryCard } from '../components/analytics/WeeklySummaryCard'
import { Leaderboard } from '../components/gamification/Leaderboard'
import { XPBar } from '../components/gamification/XPBar'
import { BadgeList } from '../components/gamification/BadgeList'
import { useTaskStore } from '../stores/taskStore'
import { useTasksQuery } from '../hooks/useTasks'

export function AnalyticsPage() {
  useTasksQuery()
  const tasks = useTaskStore(s => s.tasks ?? [])
  const completed  = tasks.filter(t => t.status === 'completed').length
  const pending    = tasks.filter(t => t.status === 'pending').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const overdue    = tasks.filter(t => t.status === 'overdue').length
  const total      = tasks.length
  const rate       = total ? Math.round(completed / total * 100) : 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 60px' }}>
      <div className="top-status">
        <span className="availability">analytics live</span>
        <span><span className="mini-tag">focus</span> → <span className="mini-tag">patterns</span></span>
      </div>

      {/* Hero */}
      <section className="section-band soft-panel" style={{ paddingTop: 40, paddingBottom: 40, marginBottom: 28 }}>
        <div className="other-projects" style={{ minHeight: 200 }}>
          <h1 className="headline" style={{ fontSize: 'clamp(44px, 5.5vw, 88px)' }}>focus</h1>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span className="section-label">completion rate</span>
            <span style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--sidebar)' }}>{rate}%</span>
          </div>
          <h1 className="headline" style={{ fontSize: 'clamp(44px, 5.5vw, 88px)' }}>proof.</h1>
        </div>
      </section>

      {/* Stat strip */}
      <div className="metric-grid" style={{ marginBottom: 28 }}>
        {[
          { label: 'total',       value: total,      color: 'var(--black)' },
          { label: 'completed',   value: completed,  color: '#16a34a' },
          { label: 'in progress', value: inProgress, color: '#2563eb' },
          { label: 'pending',     value: pending,    color: '#d97706' },
          { label: 'overdue',     value: overdue,    color: '#dc2626' },
        ].map(s => (
          <article className="metric-card" key={s.label}>
            <strong style={{ color: s.color }}>{s.value}</strong>
            <span className="section-label">{s.label}</span>
          </article>
        ))}
      </div>

      {/* XP + badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '20px 24px', background: 'var(--white)' }}>
          <p className="section-label" style={{ marginBottom: 10 }}>XP & level</p>
          <XPBar />
        </div>
        <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '20px 24px', background: 'var(--white)' }}>
          <p className="section-label" style={{ marginBottom: 10 }}>badges earned</p>
          <BadgeList />
        </div>
      </div>

      {/* Deadline Predictor — full width */}
      <div style={{ marginBottom: 20 }}>
        <DeadlineRiskPanel />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16, marginBottom: 20 }}>
        <CompletionChart />
        <PriorityPieChart />
      </div>

      {/* Streak heatmap — GitHub style, full width */}
      <div style={{ marginBottom: 20 }}>
        <StreakHeatmap />
      </div>

      {/* Focus heatmap full width */}
      <div style={{ marginBottom: 20 }}>
        <FocusHeatmap />
      </div>

      {/* Summary + Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16, marginBottom: 20 }}>
        <WeeklySummaryCard />
        <Leaderboard />
      </div>

      {/* Weekly Report CTA */}
      <Link to="/report" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, border: '1.5px solid var(--sidebar)', background: 'var(--sidebar)', padding: '20px 28px', textDecoration: 'none', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} color="var(--yellow)" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 3 }}>Weekly AI Report Card</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>AI narrative · daily bar chart · badge recap · next-week suggestions</div>
          </div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6 }}>
          view report →
        </div>
      </Link>
    </div>
  )
}
