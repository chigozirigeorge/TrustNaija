import React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-display font-semibold tracking-widest uppercase text-slate-400">
            {label}
          </label>
        )}
        <select
          ref={ref}
          {...props}
          className={cn(
            'w-full bg-navy-900/80 border text-white rounded-lg px-4 py-3 text-sm font-body',
            'transition-all duration-200 focus:outline-none appearance-none cursor-pointer',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px]',
            error
              ? 'border-danger-500/50 focus:border-danger-500'
              : 'border-white/10 focus:border-signal-500/50 focus:ring-1 focus:ring-signal-500/20',
            className
          )}
        >
          {placeholder && <option value="" className="bg-navy-900">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-navy-900">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-danger-400">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
