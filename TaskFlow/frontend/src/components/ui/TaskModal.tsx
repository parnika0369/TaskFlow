import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from './Modal'
import Input from './Input'
import Button from './Button'
import { createTask, updateTask } from '../../api/tasks'
import { getUsers } from '../../api/users'
import type { Task, TaskPriority, TaskStatus } from '../../types'

interface TaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  task?: Task | null
}

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

const selectCls = 'border border-gray-300 px-2 py-1 text-sm w-full'

export default function TaskModal({ open, onClose, projectId, task }: TaskModalProps) {
  const queryClient = useQueryClient()
  const isEdit = !!task

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setStatus(task.status)
      setPriority(task.priority)
      setDueDate(task.dueDate ?? '')
      setAssigneeId(task.assigneeId ?? '')
    } else {
      setTitle('')
      setDescription('')
      setStatus('todo')
      setPriority('medium')
      setDueDate('')
      setAssigneeId('')
    }
  }, [task, open])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createTask(projectId, {
        title,
        description: description || undefined,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      }),
    onSuccess: () => { invalidate(); onClose() },
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      const wasAssigned = !!task?.assigneeId
      const nowUnassigned = !assigneeId
      return updateTask(task!.id, {
        title,
        description: description || undefined,
        status,
        priority,
        assigneeId: assigneeId || undefined,
        clearAssignee: wasAssigned && nowUnassigned ? true : undefined,
        dueDate: dueDate || undefined,
      })
    },
    onSuccess: () => { invalidate(); onClose() },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    isEdit ? updateMutation.mutate() : createMutation.mutate()
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const isError = createMutation.isError || updateMutation.isError

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Task details..."
            className="border border-gray-300 px-3 py-2 text-sm w-full resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {isEdit && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={selectCls}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={selectCls}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={selectCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Assignee</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={selectCls}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        {isError && <p className="text-sm text-red-500">Failed to save task. Try again.</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isPending}>{isEdit ? 'Save' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}
