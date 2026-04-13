import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject } from '../api/projects'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

const LIMIT = 10

export default function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => getProjects(page, LIMIT),
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowModal(false)
      setName('')
      setDescription('')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({ name, description: description || undefined })
  }

  if (isLoading) return <div className="py-16 text-center">Loading...</div>

  if (error) return (
    <div className="py-16 text-center text-red-500">Failed to load projects. Please try again.</div>
  )

  const projects = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          {data && data.total > 0 && (
            <p className="text-sm mt-0.5">{data.total} project{data.total !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Project</Button>
      </div>

      {projects.length === 0 ? (
        <div className="py-20 text-center">No projects yet. Create your first project to get started.</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="text-left border border-gray-300 p-4"
              >
                <h3 className="font-semibold">{p.name}</h3>
                {p.description && <p className="text-sm mt-1">{p.description}</p>}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 disabled:opacity-40"
                >
                  &larr; Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 disabled:opacity-40"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Project">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website Redesign"
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="border border-gray-300 px-3 py-2 text-sm w-full resize-none"
            />
          </div>
          {createMutation.isError && (
            <p className="text-sm text-red-500">Failed to create project. Try again.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
