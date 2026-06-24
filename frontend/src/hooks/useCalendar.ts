import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../lib/api'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  source: 'google' | 'agent'
  description?: string
}

export interface BillingStatus {
  plan: string
  activated_at: string | null
  limits: { task_limit: number; agent_calls: number }
}

export function useCalendarEvents(days = 7) {
  return useQuery({
    queryKey: ['calendar', 'events', days],
    queryFn: async () => {
      const { data } = await api.get('/calendar/events', { params: { days } })
      return (Array.isArray(data) ? data : []) as CalendarEvent[]
    },
    // Don't throw on error — calendar may not be connected
    retry: false,
  })
}

export function useCalendarStatus() {
  return useQuery({
    queryKey: ['calendar', 'status'],
    queryFn: async () => {
      const { data } = await api.get<{ connected: boolean }>('/calendar/status')
      return data
    },
    retry: false,
  })
}

export function useCalendarConnect() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ auth_url: string }>('/calendar/auth')
      return data.auth_url
    },
    onSuccess: (url) => {
      window.open(url, '_blank', 'width=600,height=700')
    },
  })
}

export function useBillingStatus() {
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: async () => {
      const { data } = await api.get<BillingStatus>('/billing/status')
      return data
    },
    retry: false,
  })
}
