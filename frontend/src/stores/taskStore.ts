import { create } from 'zustand'
import type { Task, TaskPriority, TaskStatus } from '../types'

interface TaskFilters {
  status: TaskStatus | 'all'
  priority: TaskPriority | 'all'
  sortBy: 'deadline' | 'priority' | 'created_at'
}

interface TaskState {
  tasks: Task[]
  filters: TaskFilters
  selectedTaskId: string | null
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  setFilters: (filters: Partial<TaskFilters>) => void
  setSelectedTaskId: (id: string | null) => void
  getFilteredTasks: () => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  filters: { status: 'all', priority: 'all', sortBy: 'deadline' },
  selectedTaskId: null,
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, patch) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  getFilteredTasks: () => {
    const { tasks, filters } = get()
    let result = [...tasks]
    if (filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status)
    }
    if (filters.priority !== 'all') {
      result = result.filter((t) => t.priority === filters.priority)
    }
    result.sort((a, b) => {
      if (filters.sortBy === 'deadline') {
        const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity
        const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity
        return ad - bd
      }
      if (filters.sortBy === 'priority') {
        const order: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
        return order[a.priority] - order[b.priority]
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return result
  },
}))
