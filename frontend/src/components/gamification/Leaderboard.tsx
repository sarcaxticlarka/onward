import { useLeaderboard } from '../../hooks/useAnalytics'

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function Leaderboard() {
  const { data, isLoading, isError } = useLeaderboard()

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '20px 24px', background: 'var(--white)' }}>
      <p className="section-label" style={{ marginBottom: 4 }}>weekly xp</p>
      <p style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 16 }}>Leaderboard</p>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10 }} />)}
        </div>
      )}
      {isError && <p style={{ fontSize: 13, color: 'var(--danger)' }}>Could not load leaderboard.</p>}
      {!isLoading && !isError && (!data || data.length === 0) && (
        <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--gray)' }}>No leaderboard data yet.</p>
        </div>
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((entry) => (
            <li
              key={entry.user_id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 10, background: entry.rank <= 3 ? 'var(--cream-dark)' : 'var(--cream)',
                border: `1.5px solid ${entry.rank === 1 ? 'rgba(255,199,0,0.4)' : 'var(--border)'}`,
              }}
            >
              <span style={{ fontSize: 18, width: 24, flexShrink: 0, textAlign: 'center' }}>
                {MEDAL[entry.rank] ?? `#${entry.rank}`}
              </span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--black)' }}>
                {entry.display_name || `user ${entry.rank}`}
              </span>
              <span style={{
                fontWeight: 900, fontSize: 14,
                color: entry.rank === 1 ? '#b45309' : 'var(--gray)',
                background: entry.rank === 1 ? 'rgba(255,199,0,0.15)' : 'transparent',
                padding: '2px 8px', borderRadius: 100,
              }}>
                {entry.xp.toLocaleString()} XP
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
