import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'neutral' | 'accent' | 'danger' | 'warning' | 'success'

interface BadgeProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-code-bg text-text border border-border',
  accent: 'bg-accent-bg text-accent border border-accent-border',
  danger: 'bg-danger/10 text-danger border border-danger/40',
  warning: 'bg-warning/10 text-warning border border-warning/40',
  success: 'bg-success/10 text-success border border-success/40',
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
