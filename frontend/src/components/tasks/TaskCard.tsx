import { useState } from 'react'
import { ChevronRight, ChevronDown, Sparkles, Clock } from 'lucide-react'
import type { Task, TaskStatus } from '../../types'
import { formatDeadline, isUrgent, timeUntil } from '../../lib/utils'
import { useUpdateTask, useDecomposeTask } from '../../hooks/useTasks'
import { SubtaskTree } from './SubtaskTree'

const P: Record<string, { cls: string; label: string }> = {
  critical: { cls: 'badge-critical', label: 'Critical' },
  high:     { cls: 'badge-high',     label: 'High' },
  medium:   { cls: 'badge-medium',   label: 'Medium' },
  low:      { cls: 'badge-low',      label: 'Low' },
}

const S_NEXT: Partial<Record<TaskStatus, TaskStatus>> = {
  pending: 'in_progress', in_progress: 'completed', completed: 'pending', overdue: 'in_progress',
}
const S_CLS: Partial<Record<TaskStatus, string>> = {
  pending: 'badge-pending', in_progress: 'badge-progress', completed: 'badge-done', overdue: 'badge-critical',
}
const S_LABEL: Partial<Record<TaskStatus, string>> = {
  pending: 'Pending', in_progress: 'In Progress', completed: 'Done', overdue: 'Overdue',
}

export function TaskCard({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false)
  const updateTask    = useUpdateTask()
  const decomposeTask = useDecomposeTask()
  const urgent = isUrgent(task.deadline)
  const p = P[task.priority] || P.medium
  const sCls   = S_CLS[task.status]   ?? 'badge-pending'
  const sLabel = S_LABEL[task.status] ?? 'Pending'

  const cycleStatus = () => {
    const next = S_NEXT[task.status]
    if (next) updateTask.mutate({ id: task.id, patch: { status: next } })
  }

  return (
    <div className="card" style={{ transition: 'border-color 0.15s', borderLeft: urgent ? '3px solid var(--danger)' : '1.5px solid var(--border)' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Expand */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', padding: '2px 0', flexShrink: 0, marginTop: 1 }}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--black)' }}>{task.title}</span>
            <span className={`badge ${p.cls}`}>{p.label}</span>
            {urgent && (
              <span className="badge badge-critical" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} /> {timeUntil(task.deadline)}
              </span>
            )}
          </div>
          {task.description && (
            <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4, lineHeight: 1.5 }}>{task.description}</p>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--gray-light)' }}>{formatDeadline(task.deadline)}</span>
            {task.ai_score != null && (
              <span style={{ fontSize: 11, color: 'var(--sidebar)', fontWeight: 700 }}>
                score {Math.round((task.ai_score as number) * 100)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={cycleStatus}
            className={`badge ${sCls}`}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap', border: 'none' }}
          >
            {sLabel}
          </button>
          <button
            onClick={() => decomposeTask.mutate(task.id)}
            disabled={decomposeTask.isPending}
            className="pill"
            style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, borderColor: 'var(--border)', color: 'var(--sidebar)' }}
          >
            <Sparkles size={11} />
            {decomposeTask.isPending ? 'working...' : 'decompose'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <SubtaskTree parentTaskId={task.id} />
        </div>
      )}
    </div>
  )
}
