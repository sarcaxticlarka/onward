export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string | null
  deadline: string | null
  priority: TaskPriority
  status: TaskStatus
  parent_task_id: string | null
  ai_score: number
  category?: string | null
  created_at: string
  updated_at?: string
}

export interface Subtask extends Task {
  parent_task_id: string
  time_estimate_minutes?: number
}

export interface User {
  id: string
  email: string
  preferences: Record<string, unknown>
  timezone: string
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface AgentSession {
  id: string
  user_id: string
  started_at: string
  ai_plan: Record<string, unknown> | null
  actions_taken: Record<string, unknown> | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  toolTrace?: string[]
  created_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  source: 'google' | 'agent'
}

export interface ConflictItem {
  id: string
  task_id: string
  event_id: string
  reason: string
  suggested_resolution?: string
}

export interface GamificationProfile {
  xp: number
  level: 'Procrastinator' | 'Planner' | 'Achiever' | 'Legend'
  streak: number
  badges: string[]
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  xp: number
  rank: number
}

export interface AnalyticsSummary {
  summary_text: string
  completion_rate: number
  recommendations: string[]
}
