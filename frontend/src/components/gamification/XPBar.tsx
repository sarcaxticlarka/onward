import { Flame } from 'lucide-react'
import { useGamificationProfile } from '../../hooks/useAnalytics'

const LEVELS = ['Procrastinator', 'Planner', 'Achiever', 'Legend']
const THRESHOLDS = [0, 200, 600, 1500]

export function XPBar() {
  const { data, isLoading } = useGamificationProfile()

  if (isLoading) return <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
  if (!data) return null

  const idx      = Math.max(0, LEVELS.indexOf(data.level))
  const nextXP   = THRESHOLDS[idx + 1] ?? data.xp + 1
  const progress = Math.min(100, Math.round((data.xp / nextXP) * 100))

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{data.level}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gray)' }}>
            <Flame size={12} color="var(--sidebar)" />
            {data.streak_days ?? 0} day streak
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em', color: 'var(--sidebar)' }}>{data.xp}</div>
          <div style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 600 }}>XP</div>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--cream-dark)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--sidebar)', borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--gray-light)' }}>
        <span>{data.xp} xp</span>
        <span>{nextXP} xp to next level</span>
      </div>
    </div>
  )
}
