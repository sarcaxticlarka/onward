import { useTaskStore } from '../../stores/taskStore'
import { useTasksQuery } from '../../hooks/useTasks'
import { TaskCard } from './TaskCard'
import { Skeleton } from '../ui/Skeleton'
import type { TaskPriority, TaskStatus } from '../../types'

const statusOptions: Array<TaskStatus | 'all'> = ['all', 'pending', 'in_progress', 'completed', 'overdue']
const priorityOptions: Array<TaskPriority | 'all'> = ['all', 'high', 'medium', 'low']

export function TaskList() {
  const { isLoading, isError } = useTasksQuery()
  const filters = useTaskStore((state) => state.filters)
  const setFilters = useTaskStore((state) => state.setFilters)
  const filteredTasks = useTaskStore((state) => state.getFilteredTasks())

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-lg border border-border bg-bg px-2 text-sm text-text-h"
          value={filters.status}
          onChange={(event) => setFilters({ status: event.target.value as TaskStatus | 'all' })}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All statuses' : option.replace('_', ' ')}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-lg border border-border bg-bg px-2 text-sm text-text-h"
          value={filters.priority}
          onChange={(event) => setFilters({ priority: event.target.value as TaskPriority | 'all' })}
        >
          {priorityOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All priorities' : option}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-lg border border-border bg-bg px-2 text-sm text-text-h"
          value={filters.sortBy}
          onChange={(event) =>
            setFilters({ sortBy: event.target.value as 'deadline' | 'priority' | 'created_at' })
          }
        >
          <option value="deadline">Sort by deadline</option>
          <option value="priority">Sort by priority</option>
          <option value="created_at">Sort by created</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && <p className="text-sm text-danger">Failed to load tasks.</p>}

      {!isLoading && !isError && filteredTasks.length === 0 && (
        <p className="text-sm text-text">No tasks match your filters.</p>
      )}

      <div className="flex flex-col gap-3">
        {filteredTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}
