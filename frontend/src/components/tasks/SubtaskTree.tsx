import { useSubtasksQuery } from '../../hooks/useTasks'
import { formatDeadline } from '../../lib/utils'
import type { TaskStatus } from '../../types'

const STATUS_COLORS: Record<TaskStatus, { bg: string; color: string }> = {
  pending:     { bg: '#fef3c7', color: '#92400e' },
  in_progress: { bg: '#dbeafe', color: '#1e40af' },
  completed:   { bg: '#dcfce7', color: '#166534' },
  overdue:     { bg: '#fee2e2', color: '#991b1b' },
}

export function SubtaskTree({ parentTaskId }: { parentTaskId: string }) {
  const { data: subtasks, isLoading, isError } = useSubtasksQuery(parentTaskId)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 32, borderRadius: 8 }} />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p style={{ fontSize: 13, color: 'var(--danger)' }}>Failed to load subtasks.</p>
  }

  if (!subtasks || subtasks.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--gray)' }}>No subtasks yet. Try AI Decompose.</p>
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {subtasks.map((subtask) => {
        const sc = STATUS_COLORS[subtask.status] ?? STATUS_COLORS.pending
        return (
          <li
            key={subtask.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--cream)', border: '1px solid var(--border)',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--black)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>
              {subtask.title}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                {subtask.status.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 11, color: 'var(--gray)' }}>{formatDeadline(subtask.deadline)}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
