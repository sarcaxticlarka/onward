import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'No deadline'
  const date = new Date(deadline)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeUntil(deadline: string | null): string {
  if (!deadline) return ''
  const diffMs = new Date(deadline).getTime() - Date.now()
  if (diffMs <= 0) return 'Overdue'

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h left`
  if (hours > 0) return `${hours}h ${minutes % 60}m left`
  return `${minutes}m left`
}

export function isUrgent(deadline: string | null): boolean {
  if (!deadline) return false
  const diffMs = new Date(deadline).getTime() - Date.now()
  return diffMs > 0 && diffMs < 1000 * 60 * 60 * 24
}
