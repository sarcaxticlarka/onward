import { useAnalyticsSummary } from '../../hooks/useAnalytics'

export function WeeklySummaryCard() {
  const { data, isLoading, isError } = useAnalyticsSummary()

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: 20 }}>
      <p className="section-label" style={{ marginBottom: 10 }}>AI weekly summary</p>
      {isLoading && <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />}
      {isError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>Could not load summary.</p>}
      {data && (
        <p style={{ color: 'var(--gray)', fontSize: 15, lineHeight: 1.6 }}>
          {(data as any).summary || (data as any).summary_text || 'No summary available yet.'}
        </p>
      )}
    </div>
  )
}
