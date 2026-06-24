import { create } from 'zustand'
import type { ChatMessage } from '../types'

interface AgentState {
  messages: ChatMessage[]
  isStreaming: boolean
  isCrisisMode: boolean
  toolTrace: string[]
  addMessage: (message: ChatMessage) => void
  appendToLastMessage: (chunk: string) => void
  setStreaming: (streaming: boolean) => void
  setCrisisMode: (active: boolean) => void
  pushToolTrace: (line: string) => void
  clearToolTrace: () => void
  resetChat: () => void
}

export const useAgentStore = create<AgentState>((set) => ({
  messages: [],
  isStreaming: false,
  isCrisisMode: false,
  toolTrace: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  appendToLastMessage: (chunk) =>
    set((state) => {
      if (state.messages.length === 0) return state
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      messages[messages.length - 1] = { ...last, content: last.content + chunk }
      return { messages }
    }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setCrisisMode: (isCrisisMode) => set({ isCrisisMode }),
  pushToolTrace: (line) => set((state) => ({ toolTrace: [...state.toolTrace, line] })),
  clearToolTrace: () => set({ toolTrace: [] }),
  resetChat: () => set({ messages: [], toolTrace: [], isStreaming: false }),
}))
