import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-display font-semibold tracking-widest uppercase text-slate-400">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            className={cn(
              'w-full bg-navy-900/80 border text-white placeholder:text-slate-600 rounded-lg',
              'transition-all duration-200 focus:outline-none',
              leftIcon ? 'pl-10' : 'pl-4',
              rightElement ? 'pr-24' : 'pr-4',
              'py-3 text-sm font-body',
              error
                ? 'border-danger-500/50 focus:border-danger-500 focus:ring-1 focus:ring-danger-500/50'
                : 'border-white/10 focus:border-signal-500/50 focus:ring-1 focus:ring-signal-500/20',
              className
            )}
          />
          {rightElement && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-danger-400 flex items-center gap-1">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
