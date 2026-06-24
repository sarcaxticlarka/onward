import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useAgentStore } from '../../stores/agentStore'
import { useAgentChat } from '../../hooks/useAgentChat'
import { ChatMessageBubble } from './ChatMessageBubble'
import { ToolTrace } from './ToolTrace'
import { VoiceInputButton } from './VoiceInputButton'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

export function ChatPanel() {
  const [draft, setDraft] = useState('')
  const messages = useAgentStore((state) => state.messages)
  const isStreaming = useAgentStore((state) => state.isStreaming)
  const { sendMessage } = useAgentChat()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.trim() || isStreaming) return
    sendMessage(draft)
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-border p-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-sm text-text">
              Ask the agent: "I have an exam and two assignments this week — plan my schedule."
            </p>
          )}
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}
        </div>
      </div>

      <ToolTrace />

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          placeholder="Message the agent..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isStreaming}
        />
        <VoiceInputButton onResult={(transcript) => setDraft(transcript)} />
        <Button type="submit" disabled={isStreaming || !draft.trim()} aria-label="Send">
          <Send size={16} />
        </Button>
      </form>
    </div>
  )
}
