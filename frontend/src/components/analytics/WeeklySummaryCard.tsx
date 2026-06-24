import { useAnalyticsSummary } from '../../hooks/useAnalytics'
import { Skeleton } from '../ui/Skeleton'

export function WeeklySummaryCard() {
  const { data, isLoading, isError } = useAnalyticsSummary()

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="mb-2 text-sm font-medium text-text-h">AI Weekly Summary</h3>
      {isLoading && <Skeleton className="h-16 w-full" />}
      {isError && <p className="text-sm text-danger">Could not load summary.</p>}
      {data && (
        <div className="flex flex-col gap-2 text-sm text-text">
          <p>{data.summary_text}</p>
          {data.recommendations.length > 0 && (
            <ul className="list-disc pl-4">
              {data.recommendations.map((rec) => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
