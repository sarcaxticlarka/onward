import { useSubtasksQuery } from '../../hooks/useTasks'
import { Skeleton } from '../ui/Skeleton'
import { Badge } from '../ui/Badge'
import { formatDeadline } from '../../lib/utils'

interface SubtaskTreeProps {
  parentTaskId: string
}

export function SubtaskTree({ parentTaskId }: SubtaskTreeProps) {
  const { data: subtasks, isLoading, isError } = useSubtasksQuery(parentTaskId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-danger">Failed to load subtasks.</p>
  }

  if (!subtasks || subtasks.length === 0) {
    return <p className="text-sm text-text">No subtasks yet. Try AI Decompose.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {subtasks.map((subtask) => (
        <li
          key={subtask.id}
          className="flex items-center justify-between rounded-lg bg-code-bg px-3 py-2 text-sm"
        >
          <span className="text-text-h">{subtask.title}</span>
          <span className="flex items-center gap-2">
            <Badge tone="accent">{subtask.status}</Badge>
            <span className="text-xs text-text">{formatDeadline(subtask.deadline)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
