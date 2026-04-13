import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getProject, deleteProject, getProjectStats } from '../api/projects'
import { updateTask, deleteTask } from '../api/tasks'
import { getUsers } from '../api/users'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import TaskModal from '../components/ui/TaskModal'
import { PriorityBadge } from '../components/ui/Badge'
import type { Task, TaskStatus } from '../types'

const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

// ── Task card content (shared between draggable + overlay) ──────────────────
interface TaskCardContentProps {
  task: Task
  usersMap: Record<string, string>
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  isDragging?: boolean
  dragHandleProps?: Record<string, any>
}

function TaskCardContent({
  task, usersMap, onEdit, onDelete, onStatusChange, isDragging, dragHandleProps,
}: TaskCardContentProps) {
  return (
    <div className={`bg-white border border-gray-300 p-3 ${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5">
          <span {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none" title="Drag">⠿</span>
          <p className="text-sm font-medium">{task.title}</p>
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={() => onEdit(task)}>Edit</button>
          <button onClick={() => onDelete(task.id)} className="text-red-600">Del</button>
        </div>
      </div>
      {task.description && (
        <p className="text-xs mt-1 ml-5">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-1 ml-5">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && <span className="text-xs">{task.dueDate}</span>}
      </div>
      {task.assigneeId && (
        <p className="text-xs mt-1 ml-5">{usersMap[task.assigneeId] ?? 'Unknown'}</p>
      )}
      <select
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
        className="mt-2 w-full text-xs border border-gray-300 px-2 py-1"
      >
        <option value="todo">Todo</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  )
}

// ── Draggable task card ─────────────────────────────────────────────────────
function DraggableTaskCard(props: Omit<TaskCardContentProps, 'isDragging' | 'dragHandleProps'>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.task.id,
    data: { task: props.task },
  })

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }}>
      <TaskCardContent {...props} isDragging={isDragging} dragHandleProps={{ ...listeners, ...attributes }} />
    </div>
  )
}

// ── Droppable column ────────────────────────────────────────────────────────
interface DroppableColumnProps {
  col: { key: TaskStatus; label: string }
  tasks: Task[]
  usersMap: Record<string, string>
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
}

function DroppableColumn({ col, tasks, usersMap, onEdit, onDelete, onStatusChange }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })

  return (
    <div
      ref={setNodeRef}
      className={`border p-3 ${isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{col.label}</h3>
        <span className="text-xs">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-400">No tasks</div>
        )}
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            usersMap={usersMap}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  })

  const { data: stats } = useQuery({
    queryKey: ['project-stats', id],
    queryFn: () => getProjectStats(id!),
    enabled: !!id,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 60_000,
  })

  const usersMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  const deleteProjMutation = useMutation({
    mutationFn: () => deleteProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTask(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['project', id] })
      const previous = queryClient.getQueryData(['project', id])
      queryClient.setQueryData(['project', id], (old: any) => ({
        ...old,
        tasks: old.tasks.map((t: Task) => t.id === taskId ? { ...t, status } : t),
      }))
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['project', id], ctx?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] })
    },
  })

  const handleDragStart = (event: DragStartEvent) => {
    const task = project?.tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const newStatus = over.id as TaskStatus
    const task = project?.tasks.find((t) => t.id === taskId)
    if (task && task.status !== newStatus) {
      updateStatusMutation.mutate({ taskId, status: newStatus })
    }
  }

  if (isLoading) return <div className="py-16 text-center">Loading...</div>

  if (error || !project) return (
    <div className="py-16 text-center text-red-500">Project not found.</div>
  )

  const isOwner = project.ownerId === user?.id

  const filteredTasks = project.tasks.filter((t) => {
    const statusOk = statusFilter === 'all' || t.status === statusFilter
    const assigneeOk = assigneeFilter === 'all'
      ? true
      : assigneeFilter === 'unassigned'
        ? t.assigneeId === null
        : t.assigneeId === assigneeFilter
    return statusOk && assigneeOk
  })

  const tasksByStatus = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.key] = filteredTasks.filter((t) => t.status === col.key)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const assigneeIds = [...new Set(project.tasks.map((t) => t.assigneeId).filter(Boolean))] as string[]

  const cardHandlers = {
    onEdit: (t: Task) => { setEditingTask(t); setTaskModalOpen(true) },
    onDelete: (taskId: string) => deleteTaskMutation.mutate(taskId),
    onStatusChange: (taskId: string, status: TaskStatus) =>
      updateStatusMutation.mutate({ taskId, status }),
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/projects')} className="text-sm mb-4">
          &larr; Back to Projects
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && <p className="mt-1">{project.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setEditingTask(null); setTaskModalOpen(true) }}>
              + Add Task
            </Button>
            {isOwner && (
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Delete project and all tasks?')) deleteProjMutation.mutate()
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <p className="text-sm mb-6">
          Total: <strong>{stats.total}</strong>
          {STATUS_COLUMNS.map((col) => (
            <span key={col.key}> &nbsp;|&nbsp; {col.label}: <strong>{stats.byStatus[col.key] ?? 0}</strong></span>
          ))}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs border border-gray-300 ${statusFilter === s ? 'font-bold underline' : ''}`}
          >
            {s === 'all' ? 'All Status' : s.replace('_', ' ')}
          </button>
        ))}
        {assigneeIds.length > 0 && (
          <>
            {(['all', 'unassigned'] as const).map((val) => (
              <button
                key={val}
                onClick={() => setAssigneeFilter(val)}
                className={`px-3 py-1 text-xs border border-gray-300 ${assigneeFilter === val ? 'font-bold underline' : ''}`}
              >
                {val === 'all' ? 'All Assignees' : 'Unassigned'}
              </button>
            ))}
            {assigneeIds.map((aid) => (
              <button
                key={aid}
                onClick={() => setAssigneeFilter(aid)}
                className={`px-3 py-1 text-xs border border-gray-300 ${assigneeFilter === aid ? 'font-bold underline' : ''}`}
              >
                {usersMap[aid] ?? 'Unknown'}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((col) => (
            <DroppableColumn
              key={col.key}
              col={col}
              tasks={tasksByStatus[col.key]}
              usersMap={usersMap}
              {...cardHandlers}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCardContent
              task={activeTask}
              usersMap={usersMap}
              onEdit={() => {}}
              onDelete={() => {}}
              onStatusChange={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditingTask(null) }}
        projectId={id!}
        task={editingTask}
      />
    </>
  )
}
