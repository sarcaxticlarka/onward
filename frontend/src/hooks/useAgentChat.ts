import { useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAgentStore } from '../stores/agentStore'
import type { ChatMessage } from '../types'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000'

// Convert raw tool action object into a clean readable string
function formatToolTrace(data: Record<string, unknown>): string {
  const tool = data?.tool as string
  const result = data?.result as Record<string, unknown> | null

  const labels: Record<string, (r: Record<string, unknown>) => string> = {
    task_prioritize: (r) => {
      const count = (r?.prioritized as unknown[])?.length ?? 0
      return `Prioritized ${count} tasks by urgency`
    },
    task_decompose: (r) => {
      const count = (r?.subtasks as unknown[])?.length ?? 0
      return `Split task into ${count} subtasks`
    },
    calendar_read: (r) => {
      const count = (r?.events as unknown[])?.length ?? 0
      return `Read ${count} upcoming calendar events`
    },
    calendar_write: (r) => {
      const title = (r as Record<string, string>)?.title ?? 'event'
      return `Created calendar event: "${title}"`
    },
    conflict_detect: (r) => {
      const count = (r?.conflicts as unknown[])?.length ?? 0
      return count > 0 ? `Found ${count} deadline conflicts` : 'No conflicts detected'
    },
    send_notification: () => 'Sent deadline notification',
  }

  const fmt = labels[tool]
  if (fmt && result && !result.error) return fmt(result)
  if (result?.error) return `${tool}: ${result.error}`
  return tool ? `Ran: ${tool.replace('_', ' ')}` : 'Processing...'
}

export function useAgentChat() {
  const wsRef = useRef<WebSocket | null>(null)
  const accessToken = useAuthStore((state) => state.accessToken)
  const addMessage = useAgentStore((state) => state.addMessage)
  const appendToLastMessage = useAgentStore((state) => state.appendToLastMessage)
  const setStreaming = useAgentStore((state) => state.setStreaming)
  const pushToolTrace = useAgentStore((state) => state.pushToolTrace)
  const clearToolTrace = useAgentStore((state) => state.clearToolTrace)

  useEffect(() => {
    if (!accessToken) return undefined

    const socket = new WebSocket(`${WS_BASE_URL}/agent/ws`)
    wsRef.current = socket

    socket.onopen = () => {
      socket.send(JSON.stringify({ token: accessToken }))
    }

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.event === 'tool') {
          pushToolTrace(formatToolTrace(payload.data as Record<string, unknown>))
        } else if (payload.event === 'final') {
          appendToLastMessage(payload.data?.response ?? '')
          setStreaming(false)
        } else if (payload.event === 'status') {
          pushToolTrace(payload.data)
        } else if (payload.event === 'error') {
          appendToLastMessage(`Error: ${payload.data}`)
          setStreaming(false)
        }
      } catch {
        // ignore malformed frames
      }
    }

    socket.onclose = () => { setStreaming(false) }
    socket.onerror = () => { setStreaming(false) }

    return () => { socket.close() }
  }, [accessToken, appendToLastMessage, pushToolTrace, setStreaming])

  const sendMessage = useCallback(
    (content: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      const agentMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: '',
        created_at: new Date().toISOString(),
      }
      addMessage(userMessage)
      clearToolTrace()
      setStreaming(true)
      addMessage(agentMessage)

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ message: content }))
      } else {
        setStreaming(false)
      }
    },
    [addMessage, clearToolTrace, setStreaming],
  )

  return { sendMessage }
}
