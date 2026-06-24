import { useFocusHeatmap } from '../../hooks/useAnalytics'
import { Skeleton } from '../ui/Skeleton'
import { cn } from '../../lib/utils'

interface HeatmapCell {
  day: string
  hour: number
  intensity: number
}

export function FocusHeatmap() {
  const { data, isLoading } = useFocusHeatmap()

  if (isLoading) return <Skeleton className="h-40 w-full" />

  const cells: HeatmapCell[] = Array.isArray(data) ? data : []

  const intensityClass = (intensity: number) => {
    if (intensity > 0.75) return 'bg-accent'
    if (intensity > 0.5) return 'bg-accent/70'
    if (intensity > 0.25) return 'bg-accent/40'
    if (intensity > 0) return 'bg-accent/20'
    return 'bg-code-bg'
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="mb-2 text-sm font-medium text-text-h">Focus Heatmap</h3>
      {cells.length === 0 ? (
        <p className="text-sm text-text">No activity tracked yet.</p>
      ) : (
        <div className="grid grid-cols-12 gap-1">
          {cells.map((cell) => (
            <div
              key={`${cell.day}-${cell.hour}`}
              className={cn('h-4 w-4 rounded-sm', intensityClass(cell.intensity))}
              title={`${cell.day} ${cell.hour}:00`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
