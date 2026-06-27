import { useQuery } from '@tanstack/react-query'
import { Loader2, Download, Flame, Zap, Timer, Trophy, TrendingUp, TrendingDown, Minus, Star, CheckCircle2 } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../stores/authStore'

// ── Types ──────────────────────────────────────────────────────────────────

interface ReportData {
  period: { week_start: string; week_end: string; label: string }
  stats: {
    completed: number; total: number; completion_rate: number
    prev_rate: number; delta_pct: number
    focus_sessions: number; focus_minutes: number
    xp_earned: number; current_streak: number; badges_earned: number
  }
  best_day: string | null
  best_day_count: number
  daily_breakdown: { day: string; short: string; count: number }[]
  priority_counts: Record<string, number>
  badges_this_week: string[]
  ai: { headline: string; narrative: string; suggestions: string[] }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function DeltaChip({ delta }: { delta: number }) {
  if (delta === 0) return <span style={{ fontSize: 12, color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 3 }}><Minus size={11} /> same as last week</span>
  const up = delta > 0
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: up ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{delta}% vs last week
    </span>
  )
}

function DayBar({ day, count, max, isBest }: { day: string; count: number; max: number; isBest: boolean }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: count > 0 ? 900 : 400, color: isBest ? 'var(--sidebar)' : count > 0 ? 'var(--black)' : 'var(--gray)' }}>
        {count > 0 ? count : '–'}
      </div>
      <div style={{ width: '100%', height: 80, borderRadius: 8, background: 'var(--border)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{
          width: '100%',
          height: `${pct}%`,
          minHeight: count > 0 ? 8 : 0,
          background: isBest ? 'var(--sidebar)' : 'var(--blue)',
          borderRadius: 8,
          transition: 'height 0.6s ease',
        }} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: isBest ? 'var(--sidebar)' : 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {day}
      </div>
    </div>
  )
}

const BADGE_LABELS: Record<string, string> = {
  first_task:      '🎯 First Task',
  streak_7:        '🔥 7-Day Streak',
  streak_30:       '🏆 30-Day Streak',
  first_pomodoro:  '🍅 First Pomodoro',
  focus_master:    '⚡ Focus Master',
  task_10:         '✨ 10 Tasks Done',
  task_50:         '💎 50 Tasks Done',
  crisis_resolved: '🚨 Crisis Resolved',
}

const PRIORITY_STYLE: Record<string, { color: string; label: string }> = {
  critical: { color: '#dc2626', label: 'Critical' },
  high:     { color: '#ea580c', label: 'High' },
  medium:   { color: '#2563eb', label: 'Medium' },
  low:      { color: '#6b7280', label: 'Low' },
}

// ── Main page ──────────────────────────────────────────────────────────────

export function WeeklyReportPage() {
  const user = useAuthStore(s => s.user)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'weekly-report'],
    queryFn: async () => {
      const { data } = await api.get<ReportData>('/analytics/weekly-report')
      return data
    },
    staleTime: 10 * 60_000,
  })

  const handlePrint = () => window.print()

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 80px' }}>
      <div className="top-status">
        <span className="availability">weekly AI report</span>
        <span><span className="mini-tag">reflect</span> → <span className="mini-tag">improve</span></span>
      </div>

      {/* Hero */}
      <section className="section-band soft-panel" style={{ paddingTop: 40, paddingBottom: 40, marginBottom: 28 }}>
        <div className="other-projects" style={{ minHeight: 140 }}>
          <h1 className="headline" style={{ fontSize: 'clamp(40px, 5vw, 80px)' }}>weekly</h1>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span className="section-label">report card</span>
            {data && <span style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 700 }}>{data.period.label}</span>}
          </div>
          <h1 className="headline" style={{ fontSize: 'clamp(40px, 5vw, 80px)' }}>report.</h1>
        </div>
      </section>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0' }}>
          <Loader2 size={32} color="var(--sidebar)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--gray)', fontSize: 14 }}>AI is generating your report…</p>
        </div>
      )}

      {isError && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
          <p>Could not load report. Make sure you have tasks and try again.</p>
        </div>
      )}

      {data && (
        <>
          {/* ── Printable card ── */}
          <div id="report-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* AI Headline card */}
            <div style={{ borderRadius: 20, background: 'var(--sidebar)', padding: '32px 36px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
              <div style={{ position: 'absolute', bottom: -20, left: 80, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  AI REPORT CARD · {data.period.label}
                </div>
                <h2 style={{ fontWeight: 900, fontSize: 'clamp(20px, 3vw, 30px)', letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.2 }}>
                  {data.ai.headline}
                </h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 24, maxWidth: 600 }}>
                  {data.ai.narrative}
                </p>

                {/* Key stats row */}
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                  {[
                    { icon: <CheckCircle2 size={14} />, label: 'completed',     value: `${data.stats.completed}/${data.stats.total}` },
                    { icon: <Flame size={14} />,        label: 'streak',         value: `${data.stats.current_streak}d` },
                    { icon: <Timer size={14} />,         label: 'focus time',     value: `${Math.round(data.stats.focus_minutes / 60 * 10) / 10}h` },
                    { icon: <Zap size={14} />,           label: 'XP earned',      value: `+${data.stats.xp_earned}` },
                    { icon: <Trophy size={14} />,        label: 'badges',         value: data.stats.badges_earned },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--yellow)', fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 2 }}>
                        {s.icon} {s.value}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {/* Completion rate */}
              <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>completion rate</div>
                <div style={{ fontWeight: 900, fontSize: 36, letterSpacing: '-0.04em', color: data.stats.completion_rate >= 70 ? '#16a34a' : data.stats.completion_rate >= 40 ? '#ea580c' : '#dc2626', marginBottom: 4 }}>
                  {data.stats.completion_rate}%
                </div>
                <DeltaChip delta={data.stats.delta_pct} />
              </div>

              {/* Best day */}
              <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>best day</div>
                <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em', color: 'var(--sidebar)', marginBottom: 4 }}>
                  {data.best_day ?? '—'}
                </div>
                {data.best_day && (
                  <div style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 600 }}>{data.best_day_count} tasks crushed</div>
                )}
              </div>

              {/* Focus sessions */}
              <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>focus sessions</div>
                <div style={{ fontWeight: 900, fontSize: 36, letterSpacing: '-0.04em', color: 'var(--blue)', marginBottom: 4 }}>
                  {data.stats.focus_sessions}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 600 }}>
                  {data.stats.focus_minutes}min total
                </div>
              </div>

              {/* XP earned */}
              <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>XP earned</div>
                <div style={{ fontWeight: 900, fontSize: 36, letterSpacing: '-0.04em', color: '#d97706', marginBottom: 4 }}>
                  +{data.stats.xp_earned}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 600 }}>{data.stats.current_streak}d streak</div>
              </div>
            </div>

            {/* Daily bar chart */}
            <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '22px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>tasks completed by day</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                {data.daily_breakdown.map(d => (
                  <DayBar
                    key={d.day}
                    day={d.short}
                    count={d.count}
                    max={Math.max(...data.daily_breakdown.map(x => x.count), 1)}
                    isBest={d.day === data.best_day}
                  />
                ))}
              </div>
            </div>

            {/* Priority + Badges row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {/* Priority breakdown */}
              <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '22px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>priority breakdown</div>
                {Object.keys(PRIORITY_STYLE).map(p => {
                  const count = data.priority_counts[p] ?? 0
                  const total = Object.values(data.priority_counts).reduce((a, b) => a + b, 0)
                  const pct   = total > 0 ? Math.round(count / total * 100) : 0
                  const s     = PRIORITY_STYLE[p]
                  return (
                    <div key={p} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 900 }}>{count}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
                {Object.keys(data.priority_counts).length === 0 && (
                  <p style={{ color: 'var(--gray)', fontSize: 13 }}>No completed tasks this week yet.</p>
                )}
              </div>

              {/* Badges */}
              <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '22px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>badges earned this week</div>
                {data.badges_this_week.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Star size={28} color="var(--border)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: 'var(--gray)' }}>No badges yet — complete tasks to earn some!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {data.badges_this_week.map((b, i) => (
                      <div key={i} style={{ padding: '6px 12px', borderRadius: 20, background: 'var(--sidebar)', color: 'var(--yellow)', fontWeight: 700, fontSize: 13 }}>
                        {BADGE_LABELS[b] ?? `🏅 ${b}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Suggestions */}
            <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--cream-dark)', padding: '22px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                AI suggestions for next week
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.ai.suggestions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'var(--yellow)', fontWeight: 900, fontSize: 13 }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, paddingTop: 4, fontWeight: 600 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--gray)' }}>
                Generated by LMLS AI · {data.period.label} · {user?.email}
              </p>
              <button
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--white)', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: 'var(--sidebar)' }}
              >
                <Download size={14} /> save / print
              </button>
            </div>
          </div>

          {/* Print CSS */}
          <style>{`
            @media print {
              body > *:not(#root) { display: none !important; }
              nav, aside, header, .top-status, section.section-band { display: none !important; }
              #report-card { box-shadow: none !important; }
              button { display: none !important; }
            }
          `}</style>
        </>
      )}
    </div>
  )
}
