import React, { useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface SearchBarProps {
  onSearch: (value: string) => void
  loading?: boolean
  placeholder?: string
  className?: string
  size?: 'default' | 'large'
  defaultValue?: string
}

export function SearchBar({
  onSearch,
  loading,
  placeholder = 'Enter phone, account, URL, or wallet address…',
  className,
  size = 'default',
  defaultValue = '',
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  const clear = () => setValue('')

  return (
    <form onSubmit={handleSubmit} className={cn('relative flex gap-2', className)}>
      <div className="relative flex-1">
        <Search className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 text-slate-500',
          size === 'large' ? 'w-5 h-5' : 'w-4 h-4'
        )} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full bg-navy-900/90 border border-white/10 text-white placeholder:text-slate-600',
            'rounded-xl transition-all duration-200 font-body',
            'focus:outline-none focus:border-signal-500/50 focus:ring-1 focus:ring-signal-500/20',
            size === 'large' ? 'pl-12 pr-12 py-4 text-base' : 'pl-10 pr-10 py-3 text-sm',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button
        type="submit"
        variant="primary"
        loading={loading}
        disabled={!value.trim()}
        size={size === 'large' ? 'lg' : 'md'}
        className="shrink-0"
      >
        Verify
      </Button>
    </form>
  )
}
