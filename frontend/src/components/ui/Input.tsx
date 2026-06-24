import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text-h placeholder:text-text outline-none focus:border-accent-border focus:ring-2 focus:ring-accent-bg',
        className,
      )}
      {...props}
    />
  )
}
