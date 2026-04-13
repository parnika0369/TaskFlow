import client from './client'
import type { Project, ProjectDetail } from '../types'

export interface ProjectsPage {
  content: Project[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export const getProjects = (page = 1, limit = 10) =>
  client.get<ProjectsPage>('/projects', { params: { page, limit } }).then((r) => r.data)

export const getProject = (id: string) =>
  client.get<ProjectDetail>(`/projects/${id}`).then((r) => r.data)

export const createProject = (data: { name: string; description?: string }) =>
  client.post<Project>('/projects', data).then((r) => r.data)

export const updateProject = (id: string, data: { name?: string; description?: string }) =>
  client.patch<Project>(`/projects/${id}`, data).then((r) => r.data)

export const deleteProject = (id: string) =>
  client.delete(`/projects/${id}`)

export const getProjectStats = (id: string) =>
  client.get<{ total: number; byStatus: Record<string, number>; byPriority: Record<string, number> }>(
    `/projects/${id}/stats`
  ).then((r) => r.data)
