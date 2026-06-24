import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useTaskStore } from '../stores/taskStore'
import type { Task, TaskPriority, TaskStatus } from '../types'

interface TaskListParams {
  status?: TaskStatus
  priority?: TaskPriority
}

export function useTasksQuery(params: TaskListParams = {}) {
  const setTasks = useTaskStore((state) => state.setTasks)

  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const { data } = await api.get<Task[]>('/tasks', { params })
      setTasks(data)
      return data
    },
  })
}

interface CreateTaskPayload {
  raw_input: string
  priority?: TaskPriority
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const addTask = useTaskStore((state) => state.addTask)

  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const { data } = await api.post<Task>('/tasks', payload)
      return data
    },
    onSuccess: (task) => {
      addTask(task)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const updateTaskInStore = useTaskStore((state) => state.updateTask)

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { data } = await api.patch<Task>(`/tasks/${id}`, patch)
      return data
    },
    onSuccess: (task) => {
      updateTaskInStore(task.id, task)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const removeTask = useTaskStore((state) => state.removeTask)

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`)
      return id
    },
    onSuccess: (id) => {
      removeTask(id)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDecomposeTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data } = await api.post<Task[]>(`/tasks/${taskId}/decompose`)
      return data
    },
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] })
    },
  })
}

export function useSubtasksQuery(taskId: string | null) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      const { data } = await api.get<Task[]>(`/tasks/${taskId}/subtasks`)
      return data
    },
    enabled: Boolean(taskId),
  })
}
