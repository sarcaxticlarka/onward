import { Award } from 'lucide-react'
import { useGamificationProfile } from '../../hooks/useAnalytics'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'

export function BadgeList() {
  const { data, isLoading } = useGamificationProfile()

  if (isLoading) return <Skeleton className="h-12 w-full" />
  if (!data || data.badges.length === 0) {
    return <p className="text-sm text-text">No badges yet — complete tasks to earn some.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {data.badges.map((badge) => (
        <Badge key={badge} tone="accent" className="gap-1">
          <Award size={12} />
          {badge}
        </Badge>
      ))}
    </div>
  )
}
