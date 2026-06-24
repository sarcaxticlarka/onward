import { useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAgentStore } from '../stores/agentStore'
import type { ChatMessage } from '../types'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000'

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

    const socket = new WebSocket(`${WS_BASE_URL}/agent/chat?token=${accessToken}`)
    wsRef.current = socket

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'tool_trace') {
          pushToolTrace(payload.message)
        } else if (payload.type === 'token') {
          appendToLastMessage(payload.content)
        } else if (payload.type === 'done') {
          setStreaming(false)
        }
      } catch {
        // ignore malformed frames
      }
    }

    socket.onclose = () => {
      setStreaming(false)
    }

    return () => {
      socket.close()
    }
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
        wsRef.current.send(JSON.stringify({ type: 'message', content }))
      } else {
        setStreaming(false)
      }
    },
    [addMessage, clearToolTrace, setStreaming],
  )

  return { sendMessage }
}
