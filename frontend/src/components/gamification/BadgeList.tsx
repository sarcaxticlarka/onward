import { Award } from 'lucide-react'
import { useGamificationProfile } from '../../hooks/useAnalytics'

export function BadgeList() {
  const { data, isLoading, isError } = useGamificationProfile()

  if (isLoading) return <div className="skeleton" style={{ height: 48, borderRadius: 10 }} />
  if (isError) return <p style={{ fontSize: 13, color: 'var(--danger)' }}>Could not load badges.</p>
  if (!data || !data.badges || data.badges.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--gray)' }}>No badges yet — complete tasks to earn some.</p>
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {data.badges.map((badge) => (
        <span
          key={badge}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 100,
            background: 'var(--cream-dark)', border: '1.5px solid var(--border)',
            fontSize: 12, fontWeight: 700, color: 'var(--sidebar)',
          }}
        >
          <Award size={12} />
          {badge}
        </span>
      ))}
    </div>
  )
}
