import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { AnalyticsSummary, GamificationProfile, LeaderboardEntry } from '../types'

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<AnalyticsSummary>('/analytics/summary')
      return data
    },
  })
}

export function useCompletionRate(range: 'day' | 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: ['analytics', 'completion-rate', range],
    queryFn: async () => {
      const { data } = await api.get('/analytics/completion-rate', { params: { range } })
      return data
    },
  })
}

export function useFocusHeatmap() {
  return useQuery({
    queryKey: ['analytics', 'focus-heatmap'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/focus-heatmap')
      return data
    },
  })
}

export function useGamificationProfile() {
  return useQuery({
    queryKey: ['gamification', 'profile'],
    queryFn: async () => {
      const { data } = await api.get<GamificationProfile>('/gamification/profile')
      return data
    },
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['gamification', 'leaderboard'],
    queryFn: async () => {
      const { data } = await api.get<LeaderboardEntry[]>('/gamification/leaderboard')
      return data
    },
  })
}
