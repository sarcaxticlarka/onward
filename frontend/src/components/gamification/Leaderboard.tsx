import { useLeaderboard } from '../../hooks/useAnalytics'
import { Skeleton } from '../ui/Skeleton'

export function Leaderboard() {
  const { data, isLoading } = useLeaderboard()

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!data || data.length === 0) {
    return <p className="text-sm text-text">No leaderboard data yet.</p>
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="mb-2 text-sm font-medium text-text-h">Weekly Leaderboard</h3>
      <ol className="flex flex-col gap-1">
        {data.map((entry) => (
          <li
            key={entry.user_id}
            className="flex items-center justify-between rounded-lg px-2 py-1 text-sm text-text"
          >
            <span>
              #{entry.rank} {entry.display_name}
            </span>
            <span className="font-medium text-text-h">{entry.xp} XP</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
