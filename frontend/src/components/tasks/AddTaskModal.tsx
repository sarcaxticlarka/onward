import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import { useCreateTask } from '../../hooks/useTasks'
import type { TaskPriority } from '../../types'

const EXAMPLES = [
  'Submit ML assignment by Friday 11pm',
  'Fix critical bug in prod by EOD',
  'Write 2000 word essay due Sunday',
  'Review 50 pages before tomorrow',
]

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high',     label: 'High',     color: '#f59e0b' },
  { value: 'medium',   label: 'Medium',   color: '#3b82f6' },
  { value: 'low',      label: 'Low',      color: '#6b7280' },
]

export function AddTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rawInput, setRawInput]   = useState('')
  const [priority, setPriority]   = useState<TaskPriority | 'auto'>('auto')
  const [deadline, setDeadline]   = useState('')
  const createTask = useCreateTask()
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 })
      gsap.fromTo(cardRef.current, { y: 20, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' })
    }
  }, [open])

  if (!open) return null

  const close = () => {
    gsap.to(cardRef.current, {
      y: 12, opacity: 0, duration: 0.2,
      onComplete: () => { setRawInput(''); setPriority('auto'); setDeadline(''); onClose() },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawInput.trim()) return
    // Build enriched input for AI parser
    let input = rawInput.trim()
    if (deadline) input += ` (deadline: ${deadline})`
    createTask.mutate(
      { raw_input: input, priority: priority === 'auto' ? undefined : priority },
      { onSuccess: close },
    )
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && close()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
    >
      <div ref={cardRef} className="card" style={{ width: '100%', maxWidth: 560, borderRadius: 18, padding: 32, background: 'var(--white)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>new task</p>
            <h2 style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em' }}>add task.</h2>
          </div>
          <button onClick={close} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Natural language input */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              describe your task
            </label>
            <textarea
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder="Submit ML assignment by Friday 11pm..."
              autoFocus
              rows={3}
              style={{ width: '100%', resize: 'none', borderRadius: 10, lineHeight: 1.6, fontSize: 14 }}
            />
            {/* Example chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {EXAMPLES.map(ex => (
                <button
                  key={ex} type="button" onClick={() => setRawInput(ex)}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, border: '1.5px solid var(--border)', color: 'var(--gray)', background: 'var(--cream)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {ex.substring(0, 28)}…
                </button>
              ))}
            </div>
          </div>

          {/* Priority + Deadline row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Priority picker */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                priority
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setPriority('auto')}
                  style={{
                    textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${priority === 'auto' ? 'var(--sidebar)' : 'var(--border)'}`,
                    background: priority === 'auto' ? 'var(--sidebar)' : 'var(--cream)',
                    color: priority === 'auto' ? '#fff' : 'var(--gray)',
                  }}
                >
                  ✦ AI decides
                </button>
                {PRIORITIES.map(p => (
                  <button
                    key={p.value} type="button" onClick={() => setPriority(p.value)}
                    style={{
                      textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${priority === p.value ? p.color : 'var(--border)'}`,
                      background: priority === p.value ? `${p.color}18` : 'var(--cream)',
                      color: priority === p.value ? p.color : 'var(--gray)',
                    }}
                  >
                    <span style={{ marginRight: 6, color: p.color }}>●</span>{p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                deadline (optional)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--cream)', fontSize: 13, fontFamily: 'inherit', color: 'var(--black)', cursor: 'pointer' }}
              />
              <p style={{ marginTop: 8, fontSize: 11, color: 'var(--gray)', lineHeight: 1.5 }}>
                Or include the deadline in your description — AI will parse it automatically.
              </p>
            </div>
          </div>

          {createTask.isError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fde8e8', border: '1.5px solid #f5c6c6', color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
              Could not create task. Please try again.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={close} className="pill" style={{ fontSize: 13 }}>cancel</button>
            <button
              type="submit"
              disabled={createTask.isPending || !rawInput.trim()}
              className="pill pill-black"
              style={{ fontSize: 13, opacity: (!rawInput.trim() || createTask.isPending) ? 0.5 : 1 }}
            >
              <Sparkles size={13} />
              {createTask.isPending ? 'creating...' : 'add task'}
              {!createTask.isPending && <ArrowRight size={13} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
