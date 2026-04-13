import type { TaskPriority, TaskStatus } from '../../types'

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className="text-xs">{statusLabels[status]}</span>
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className="text-xs capitalize">{priority}</span>
}
