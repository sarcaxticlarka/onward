import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import { useCreateTask } from '../../hooks/useTasks'

const EXAMPLES = [
  'Submit ML assignment by Friday 11pm',
  'Fix critical bug in prod by EOD',
  'Write 2000 word essay due Sunday',
  'Review 50 pages before tomorrow',
]

export function AddTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rawInput, setRawInput] = useState('')
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
    gsap.to(cardRef.current, { y: 12, opacity: 0, duration: 0.2, onComplete: () => { setRawInput(''); onClose() } })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawInput.trim()) return
    createTask.mutate(rawInput, { onSuccess: close })
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && close()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
    >
      <div ref={cardRef} className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 16, padding: 28, background: 'var(--white)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>new task</p>
            <h2 style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em' }}>add task.</h2>
          </div>
          <button onClick={close} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray)', marginBottom: 8 }}>
            describe in plain english — AI will parse deadline, priority & category
          </label>
          <textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder="Submit ML assignment by Friday 11pm..."
            autoFocus
            rows={3}
            style={{ resize: 'none', borderRadius: 10, lineHeight: 1.6 }}
          />

          {/* Example chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 16 }}>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                type="button"
                onClick={() => setRawInput(ex)}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, border: '1.5px solid var(--border)', color: 'var(--gray)', background: 'var(--cream)', cursor: 'pointer', fontWeight: 600 }}
              >
                {ex.substring(0, 28)}…
              </button>
            ))}
          </div>

          {createTask.isError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fde8e8', border: '1.5px solid #f5c6c6', color: 'var(--danger)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              Could not create task. Please try again.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={close} className="pill" style={{ fontSize: 13 }}>cancel</button>
            <button
              type="submit"
              disabled={createTask.isPending || !rawInput.trim()}
              className="pill pill-black"
              style={{ fontSize: 13, opacity: (!rawInput.trim() || createTask.isPending) ? 0.5 : 1 }}
            >
              <Sparkles size={13} />
              {createTask.isPending ? 'parsing with ai...' : 'add task'}
              {!createTask.isPending && <ArrowRight size={13} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
