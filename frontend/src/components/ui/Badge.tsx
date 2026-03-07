import React from 'react'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/types'

interface RiskBadgeProps {
  level?: RiskLevel
  score?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function RiskBadge({ level, score, size = 'md', className }: RiskBadgeProps) {
  // Determine level from score if not provided
  const riskLevel = level || (score !== undefined ? (
    score >= 75 ? 'CRITICAL' :
    score >= 50 ? 'HIGH' :
    score >= 25 ? 'MEDIUM' :
    'LOW'
  ) : 'LOW')

  const styles: Record<RiskLevel, string> = {
    LOW: 'bg-signal-500/15 text-signal-400 border-signal-500/25',
    MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    HIGH: 'bg-danger-500/15 text-danger-400 border-danger-500/25',
    CRITICAL: 'bg-danger-600/25 text-danger-300 border-danger-500/40',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-display font-semibold tracking-wider uppercase rounded-full border',
        styles[riskLevel],
        sizes[size],
        className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        riskLevel === 'LOW' ? 'bg-signal-400' :
        riskLevel === 'MEDIUM' ? 'bg-amber-400' : 'bg-danger-400'
      )} />
      {score !== undefined ? `${riskLevel} (${score})` : riskLevel}
      {score !== undefined && ` · ${score}`}
    </span>
  )
}

interface TagProps {
  children: React.ReactNode
  className?: string
}

export function Tag({ children, className }: TagProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium',
      'bg-navy-800 text-slate-300 border border-white/8',
      className
    )}>
      #{children}
    </span>
  )
}

// Alias for backward compatibility
export const StatusBadge = RiskBadge
export const TagBadge = Tag
