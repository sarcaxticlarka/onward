import { useState } from 'react'
import { ChevronRight, ChevronDown, Sparkles, Clock, Check, Play, RotateCcw, Timer } from 'lucide-react'
import type { Task, TaskStatus } from '../../types'
import { formatDeadline, isUrgent, timeUntil } from '../../lib/utils'
import { useUpdateTask, useDecomposeTask } from '../../hooks/useTasks'
import { SubtaskTree } from './SubtaskTree'
import { toast } from '../ui/Toast'
import { PomodoroTimer } from '../pomodoro/PomodoroTimer'

const PRIORITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: '#fee2e2', color: '#991b1b', label: 'Critical' },
  high:     { bg: '#fef3c7', color: '#92400e', label: 'High' },
  medium:   { bg: '#dbeafe', color: '#1e40af', label: 'Medium' },
  low:      { bg: '#f3f4f6', color: '#4b5563', label: 'Low' },
}

const STATUS_STYLE: Record<TaskStatus, { bg: string; color: string; border: string; label: string }> = {
  pending:     { bg: '#f9fafb', color: '#6b7280', border: '#d1d5db', label: 'Pending' },
  in_progress: { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd', label: 'In Progress' },
  completed:   { bg: '#f0fdf4', color: '#15803d', border: '#86efac', label: 'Completed' },
  overdue:     { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', label: 'Overdue' },
}

// What the 3 action buttons do for each status
const ACTIONS: Record<TaskStatus, Array<{ label: string; icon: React.ReactNode; next: TaskStatus; style: { bg: string; color: string } }>> = {
  pending: [
    { label: 'Start',    icon: <Play size={11} />,       next: 'in_progress', style: { bg: '#eff6ff', color: '#1d4ed8' } },
    { label: 'Done',     icon: <Check size={11} />,      next: 'completed',   style: { bg: '#f0fdf4', color: '#15803d' } },
  ],
  in_progress: [
    { label: 'Done',     icon: <Check size={11} />,      next: 'completed',   style: { bg: '#f0fdf4', color: '#15803d' } },
    { label: 'Pending',  icon: <RotateCcw size={11} />,  next: 'pending',     style: { bg: '#f9fafb', color: '#6b7280' } },
  ],
  completed: [
    { label: 'Reopen',   icon: <RotateCcw size={11} />,  next: 'pending',     style: { bg: '#fef3c7', color: '#92400e' } },
  ],
  overdue: [
    { label: 'Start',    icon: <Play size={11} />,       next: 'in_progress', style: { bg: '#eff6ff', color: '#1d4ed8' } },
    { label: 'Done',     icon: <Check size={11} />,      next: 'completed',   style: { bg: '#f0fdf4', color: '#15803d' } },
  ],
}

export function TaskCard({ task }: { task: Task }) {
  const [expanded, setExpanded]   = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
  const updateTask    = useUpdateTask()
  const decomposeTask = useDecomposeTask()
  const urgent = isUrgent(task.deadline)
  const ps = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.medium
  const ss = STATUS_STYLE[task.status] ?? STATUS_STYLE.pending
  const actions = ACTIONS[task.status] ?? []
  const isCompleted = task.status === 'completed'

  const COMPLETION_MSGS = [
    'Keep crushing it!', 'One down, more to go!', "That's the spirit!",
    "You're on a roll!", 'Nailed it!', 'Progress is progress!',
  ]

  const setStatus = (next: TaskStatus) => {
    // Fire toast immediately — don't wait for backend round-trip
    if (next === 'completed') {
      const msg = COMPLETION_MSGS[Math.floor(Math.random() * COMPLETION_MSGS.length)]
      toast({
        type: 'success',
        title: '✓ Task completed',
        message: `"${task.title.slice(0, 48)}${task.title.length > 48 ? '…' : ''}" — ${msg}`,
        duration: 3500,
      })
    } else if (next === 'in_progress') {
      toast({ type: 'info', title: 'Task started', message: `Working on "${task.title.slice(0, 40)}…"` })
    } else if (next === 'pending') {
      toast({ type: 'info', title: 'Task reopened', message: `"${task.title.slice(0, 48)}…" moved back to pending` })
    }
    updateTask.mutate({ id: task.id, patch: { status: next } })
  }

  return (
    <div
      className="card"
      style={{
        transition: 'opacity 0.2s',
        opacity: isCompleted ? 0.7 : 1,
        borderLeft: urgent && !isCompleted ? '3px solid var(--danger)' : isCompleted ? '3px solid #86efac' : '1.5px solid var(--border)',
      }}
    >
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', padding: '2px 0', flexShrink: 0, marginTop: 2 }}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        {/* Completion checkbox */}
        <button
          onClick={() => setStatus(isCompleted ? 'pending' : 'completed')}
          title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
          disabled={updateTask.isPending}
          style={{
            flexShrink: 0, marginTop: 2, width: 20, height: 20, borderRadius: 6,
            border: `2px solid ${isCompleted ? '#86efac' : 'var(--border)'}`,
            background: isCompleted ? '#f0fdf4' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {isCompleted && <Check size={12} color="#15803d" strokeWidth={3} />}
        </button>

        {/* Task content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontWeight: 700, fontSize: 14,
              textDecoration: isCompleted ? 'line-through' : 'none',
              color: isCompleted ? 'var(--gray)' : 'var(--black)',
            }}>
              {task.title}
            </span>
            {/* Priority badge */}
            <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: ps.bg, color: ps.color }}>
              {ps.label}
            </span>
            {/* Status badge */}
            <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
              {ss.label}
            </span>
            {urgent && !isCompleted && (
              <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} /> {timeUntil(task.deadline)}
              </span>
            )}
          </div>
          {task.description && (
            <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4, lineHeight: 1.5 }}>{task.description}</p>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--gray-light)' }}>{formatDeadline(task.deadline)}</span>
            {task.ai_score != null && !isCompleted && (
              <span style={{ fontSize: 11, color: 'var(--sidebar)', fontWeight: 700 }}>
                score {Math.round((task.ai_score as number) * 100)}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0, alignItems: 'flex-end' }}>
          {/* Status action buttons */}
          <div style={{ display: 'flex', gap: 5 }}>
            {actions.map(action => (
              <button
                key={action.label}
                onClick={() => setStatus(action.next)}
                disabled={updateTask.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: updateTask.isPending ? 'not-allowed' : 'pointer',
                  border: `1.5px solid ${action.style.color}30`,
                  background: action.style.bg, color: action.style.color,
                  transition: 'opacity 0.15s',
                  opacity: updateTask.isPending ? 0.5 : 1,
                }}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
          {/* Decompose + Pomodoro buttons */}
          {!isCompleted && (
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={() => decomposeTask.mutate(task.id)}
                disabled={decomposeTask.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: decomposeTask.isPending ? 'not-allowed' : 'pointer',
                  border: '1.5px solid var(--border)', background: 'var(--cream)',
                  color: 'var(--sidebar)', opacity: decomposeTask.isPending ? 0.5 : 1,
                }}
              >
                <Sparkles size={11} />
                {decomposeTask.isPending ? 'splitting...' : 'decompose'}
              </button>
              <button
                onClick={() => setShowPomodoro(true)}
                title="Start 25-min focus session"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', border: '1.5px solid var(--yellow)',
                  background: 'var(--sidebar)', color: 'var(--yellow)',
                }}
              >
                <Timer size={11} /> focus
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pomodoro full-screen timer */}
      {showPomodoro && <PomodoroTimer task={task} onClose={() => setShowPomodoro(false)} />}

      {/* Subtasks */}
      {expanded && (
        <div style={{ padding: '0 16px 14px 46px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <SubtaskTree parentTaskId={task.id} />
        </div>
      )}
    </div>
  )
}
