import { CompletionChart } from '../components/analytics/CompletionChart'
import { PriorityPieChart } from '../components/analytics/PriorityPieChart'
import { FocusHeatmap } from '../components/analytics/FocusHeatmap'
import { WeeklySummaryCard } from '../components/analytics/WeeklySummaryCard'
import { Leaderboard } from '../components/gamification/Leaderboard'
import { IconStack } from '../components/brand/BrandMarks'

export function AnalyticsPage() {
  return (
    <div>
      <div className="top-status">
        <span className="availability">LMLS focus patterns updating</span>
        <span><span className="mini-tag">2015</span> - <span className="mini-tag">2026</span></span>
      </div>

      <section className="section-band soft-panel" style={{ paddingTop: 42, paddingBottom: 42, marginBottom: 26 }}>
        <div className="other-projects" style={{ minHeight: 250 }}>
          <h1 className="headline" style={{ fontSize: 'clamp(48px, 6vw, 96px)' }}>focus</h1>
          <IconStack />
          <h1 className="headline" style={{ fontSize: 'clamp(48px, 6vw, 96px)' }}>proof</h1>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(420px,1fr))', gap: 16, marginBottom: 16 }}>
        <CompletionChart />
        <PriorityPieChart />
      </div>
      <div style={{ marginBottom: 16 }}><FocusHeatmap /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(420px,1fr))', gap: 16 }}>
        <WeeklySummaryCard />
        <Leaderboard />
      </div>
    </div>
  )
}
