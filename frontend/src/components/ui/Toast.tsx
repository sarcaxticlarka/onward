import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, X, Flame, Star } from 'lucide-react'

export interface ToastItem {
  id: string
  type: 'success' | 'info' | 'xp'
  title: string
  message?: string
  duration?: number
}

// Global singleton queue
let _listeners: Array<(t: ToastItem) => void> = []

export function toast(item: Omit<ToastItem, 'id'>) {
  const t: ToastItem = { ...item, id: Math.random().toString(36).slice(2) }
  _listeners.forEach(fn => fn(t))
}

function SingleToast({ item, onDone }: { item: ToastItem; onDone: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const dur = item.duration ?? 3200

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDone(item.id), 350)
    }, dur)
    return () => clearTimeout(t)
  }, [])

  const icon = item.type === 'xp'
    ? <Star size={18} fill="#d97706" color="#d97706" />
    : item.type === 'success'
    ? <CheckCircle2 size={18} color="#16a34a" />
    : <Flame size={18} color="var(--sidebar)" />

  const accent = item.type === 'xp' ? '#fef3c7' : item.type === 'success' ? '#f0fdf4' : '#eff6ff'
  const border = item.type === 'xp' ? '#fde68a' : item.type === 'success' ? '#86efac' : '#bfdbfe'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        border: `1.5px solid ${border}`,
        borderLeft: `4px solid ${item.type === 'xp' ? '#d97706' : item.type === 'success' ? '#16a34a' : 'var(--sidebar)'}`,
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        minWidth: 280, maxWidth: 360,
        background: accent,
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.9)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        cursor: 'default',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 1 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--black)', marginBottom: item.message ? 2 : 0 }}>
          {item.title}
        </div>
        {item.message && (
          <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.4 }}>{item.message}</div>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDone(item.id), 350) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--gray)', flexShrink: 0 }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((t: ToastItem) => {
    setToasts(prev => [...prev.slice(-4), t]) // max 5 visible
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    _listeners.push(addToast)
    return () => { _listeners = _listeners.filter(fn => fn !== addToast) }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999, pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <SingleToast item={t} onDone={removeToast} />
        </div>
      ))}
    </div>
  )
}
