import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Bot, Loader2, Mic, Send, Zap } from 'lucide-react'
import { useAgentStore } from '../../stores/agentStore'
import { useAgentChat } from '../../hooks/useAgentChat'
import { VoiceInputButton } from './VoiceInputButton'

const QUICK_PROMPTS = [
  'I have 3 assignments due this week — plan my schedule',
  'Break down my highest priority task into subtasks',
  'Which tasks are most at risk of missing deadline?',
  'Activate crisis mode — I have a deadline in 6 hours',
]

export function ChatPanel() {
  const [draft, setDraft] = useState('')
  const messages = useAgentStore((state) => state.messages)
  const isStreaming = useAgentStore((state) => state.isStreaming)
  const toolTrace = useAgentStore((state) => state.toolTrace)
  const { sendMessage } = useAgentChat()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, toolTrace])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || isStreaming) return
    sendMessage(draft.trim())
    setDraft('')
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Message thread */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {messages.length === 0 && (
          <div style={{ margin: 'auto 0', paddingTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} color="var(--yellow)" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Onward Agent</div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>AI productivity assistant — online</div>
              </div>
            </div>
            <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 20 }}>
              I can decompose your tasks, detect calendar conflicts, build hour-by-hour recovery plans, and prioritize what matters most. What's the pressure today?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => { setDraft(p); inputRef.current?.focus() }}
                  style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--cream)', fontSize: 13, fontWeight: 600, color: 'var(--black)', cursor: 'pointer', lineHeight: 1.4 }}
                >
                  <Zap size={11} style={{ marginRight: 5, color: 'var(--yellow)' }} />
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 10 }}>
              {!isUser && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Bot size={15} color="var(--yellow)" />
                </div>
              )}
              <div
                style={{
                  maxWidth: '75%',
                  padding: '11px 16px',
                  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isUser ? 'var(--sidebar)' : 'var(--cream-dark)',
                  color: isUser ? '#fff' : 'var(--black)',
                  fontSize: 14,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content || (
                  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13, color: 'var(--gray)' }}>thinking...</span>
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Tool trace */}
        {toolTrace.length > 0 && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--cream-dark)', border: '1.5px solid var(--border)', fontSize: 12, color: 'var(--gray)' }}>
            <strong style={{ display: 'block', marginBottom: 4, color: 'var(--black)' }}>agent activity</strong>
            {toolTrace.map((line, i) => <div key={i} style={{ marginBottom: 2 }}>→ {line}</div>)}
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding: '16px 32px 24px', borderTop: '1.5px solid var(--border)', background: 'var(--white)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask the agent... (Enter to send, Shift+Enter for new line)"
            disabled={isStreaming}
            rows={2}
            style={{
              flex: 1, resize: 'none', borderRadius: 12, padding: '12px 16px',
              fontSize: 14, lineHeight: 1.5, border: '1.5px solid var(--border)',
              background: 'var(--cream)', outline: 'none', fontFamily: 'inherit',
              opacity: isStreaming ? 0.6 : 1,
            }}
          />
          <VoiceInputButton onResult={t => setDraft(t)} />
          <button
            type="submit"
            disabled={isStreaming || !draft.trim()}
            style={{
              width: 48, height: 48, borderRadius: 12, border: 0, flexShrink: 0,
              background: isStreaming || !draft.trim() ? 'var(--border)' : 'var(--sidebar)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isStreaming || !draft.trim() ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
            }}
          >
            {isStreaming ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          </button>
        </form>
        <p style={{ marginTop: 8, fontSize: 11, color: 'var(--gray-light)' }}>
          Onward agent has context of your tasks and calendar. Ask anything productivity-related.
        </p>
      </div>
    </div>
  )
}
