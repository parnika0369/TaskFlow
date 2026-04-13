import client from './client'
import type { Task, TaskPriority, TaskStatus } from '../types'

export const getTasks = (projectId: string, params?: { status?: string; assignee?: string }) =>
  client
    .get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`, { params })
    .then((r) => r.data.tasks)

export const createTask = (
  projectId: string,
  data: {
    title: string
    description?: string
    priority?: TaskPriority
    assigneeId?: string
    dueDate?: string
  }
) => client.post<Task>(`/projects/${projectId}/tasks`, data).then((r) => r.data)

export const updateTask = (
  id: string,
  data: {
    title?: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    assigneeId?: string
    clearAssignee?: boolean
    dueDate?: string
  }
) => client.patch<Task>(`/tasks/${id}`, data).then((r) => r.data)

export const deleteTask = (id: string) => client.delete(`/tasks/${id}`)
