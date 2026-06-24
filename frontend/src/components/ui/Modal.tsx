import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={cn(
          'w-full max-w-lg rounded-xl border border-border bg-bg p-6 shadow-xl',
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && <h2 className="mb-4 text-lg font-semibold text-text-h">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  )
}
