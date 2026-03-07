import React from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-display font-semibold tracking-widest uppercase text-slate-400">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          {...props}
          className={cn(
            'w-full bg-navy-900/80 border text-white placeholder:text-slate-600 rounded-lg',
            'transition-all duration-200 focus:outline-none resize-none',
            'px-4 py-3 text-sm font-body',
            error
              ? 'border-danger-500/50 focus:border-danger-500 focus:ring-1 focus:ring-danger-500/50'
              : 'border-white/10 focus:border-signal-500/50 focus:ring-1 focus:ring-signal-500/20',
            className
          )}
        />
        {error && <p className="text-xs text-danger-400">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
