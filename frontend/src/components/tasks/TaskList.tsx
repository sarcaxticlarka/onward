import { useTaskStore } from '../../stores/taskStore'
import { useTasksQuery } from '../../hooks/useTasks'
import { TaskCard } from './TaskCard'
import { Skeleton } from '../ui/Skeleton'
import type { TaskPriority, TaskStatus } from '../../types'

const statusOptions: Array<TaskStatus | 'all'> = ['all', 'pending', 'in_progress', 'completed', 'overdue']
const priorityOptions: Array<TaskPriority | 'all'> = ['all', 'critical', 'high', 'medium', 'low']

export function TaskList() {
  const { isLoading, isError } = useTasksQuery()
  const tasks = useTaskStore((state) => state.tasks)
  const filters = useTaskStore((state) => state.filters)
  const setFilters = useTaskStore((state) => state.setFilters)

  // Compute filtered+sorted tasks inline to avoid selector returning new array every call
  let filteredTasks = [...tasks]
  if (filters.status !== 'all') filteredTasks = filteredTasks.filter(t => t.status === filters.status)
  if (filters.priority !== 'all') filteredTasks = filteredTasks.filter(t => t.priority === filters.priority)
  filteredTasks.sort((a, b) => {
    if (filters.sortBy === 'deadline') {
      const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity
      const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity
      return ad - bd
    }
    if (filters.sortBy === 'priority') {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <select
          style={{ height: 36, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '0 10px', fontSize: 13, color: 'var(--black)', cursor: 'pointer' }}
          value={filters.status}
          onChange={e => setFilters({ status: e.target.value as TaskStatus | 'all' })}
        >
          {statusOptions.map(o => <option key={o} value={o}>{o === 'all' ? 'All statuses' : o.replace('_', ' ')}</option>)}
        </select>
        <select
          style={{ height: 36, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '0 10px', fontSize: 13, color: 'var(--black)', cursor: 'pointer' }}
          value={filters.priority}
          onChange={e => setFilters({ priority: e.target.value as TaskPriority | 'all' })}
        >
          {priorityOptions.map(o => <option key={o} value={o}>{o === 'all' ? 'All priorities' : o}</option>)}
        </select>
        <select
          style={{ height: 36, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--white)', padding: '0 10px', fontSize: 13, color: 'var(--black)', cursor: 'pointer' }}
          value={filters.sortBy}
          onChange={e => setFilters({ sortBy: e.target.value as 'deadline' | 'priority' | 'created_at' })}
        >
          <option value="deadline">Sort by deadline</option>
          <option value="priority">Sort by priority</option>
          <option value="created_at">Sort by created</option>
        </select>
      </div>

      {isLoading && [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 86, borderRadius: 12 }} />)}
      {isError && <p style={{ color: 'var(--danger)', fontSize: 14 }}>Failed to load tasks.</p>}
      {!isLoading && !isError && filteredTasks.length === 0 && (
        <p style={{ color: 'var(--gray)', fontSize: 15 }}>No tasks match your filters.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredTasks.map(task => <TaskCard key={task.id} task={task} />)}
      </div>
    </div>
  )
}
